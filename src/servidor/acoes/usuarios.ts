"use server";

import { z } from "zod";
import { traduzirErroBanco } from "@/dominio/erros";
import { instanteEmFortaleza } from "@/dominio/tempo";
import { escaparHtml } from "@/dominio/mensagem-alerta";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarEmail } from "@/servidor/email";
import { revalidarPainel } from "@/servidor/revalidar";
import { exigirContexto } from "@/servidor/sessao";
import type { EstadoFormulario } from "@/tipos";

function senhaTemporaria() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString("base64url");
}

export async function convidarUsuario(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirContexto({ papeis: ["admin"] });
  const lido = z
    .object({
      email: z.string().trim().email("Informe um e-mail válido.").max(320),
      nome: z.string().trim().min(2, "Informe o nome.").max(160),
      papel: z.enum(["admin", "risco", "auditor"]),
      acesso_expira_em: z.string().optional().or(z.literal("")),
    })
    .safeParse({
      email: formData.get("email"),
      nome: formData.get("nome"),
      papel: formData.get("papel"),
      acesso_expira_em: formData.get("acesso_expira_em") ?? "",
    });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  const expira = instanteEmFortaleza(lido.data.acesso_expira_em);
  if (lido.data.acesso_expira_em && !expira) return { erro: "Data de expiração inválida." };

  const status = lido.data.papel === "auditor" ? "pendente" : "aprovado";
  const admin = criarClienteAdmin();
  const senha = senhaTemporaria();
  const { data, error } = await admin.auth.admin.createUser({
    email: lido.data.email,
    password: senha,
    email_confirm: true,
    user_metadata: {
      nome: lido.data.nome,
      papel: lido.data.papel,
      status_acesso: status,
    },
  });
  if (error || !data.user) {
    return { erro: "Não foi possível criar o usuário. Confira se o e-mail já existe." };
  }

  const { error: erroPerfil } = await admin.from("profiles").upsert({
    id: data.user.id,
    email: lido.data.email,
    nome: lido.data.nome,
    papel: lido.data.papel,
    status_acesso: status,
    acesso_expira_em: lido.data.papel === "auditor" ? expira : null,
  });
  if (erroPerfil) return { erro: traduzirErroBanco(erroPerfil.message, erroPerfil.code) };

  const link = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  const envio = await enviarEmail({
    destinatarios: [lido.data.email],
    assunto: "[Cicobi] Acesso à Central de Auditorias",
    texto: `Olá, ${lido.data.nome}. Seu acesso foi criado. Entre em ${link}/login com este e-mail. Senha temporária: ${senha}. No primeiro acesso o sistema exige o aplicativo autenticador. Troque a senha depois de entrar.`,
    html: `<p>Olá, ${escaparHtml(lido.data.nome)}.</p><p>Seu acesso à Central de Auditorias da Cicobi Central Nordeste foi criado.</p><p>Entre em <a href="${escaparHtml(`${link}/login`)}">${escaparHtml(`${link}/login`)}</a> com este e-mail.</p><p>Senha temporária: <strong>${escaparHtml(senha)}</strong></p><p>No primeiro acesso o sistema exige o aplicativo autenticador. Troque a senha depois de entrar.</p>`,
  });

  revalidarPainel();
  if (!envio.ok) {
    return {
      sucesso: "Usuário criado. O e-mail não foi enviado; copie a senha temporária agora.",
      linkConvite: senha,
    };
  }
  return { sucesso: "Usuário criado e senha temporária enviada por e-mail." };
}

export async function atualizarAcesso(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { perfil } = await exigirContexto({ papeis: ["admin"] });
  const lido = z
    .object({
      id: z.string().uuid(),
      papel: z.enum(["admin", "risco", "auditor"]),
      status_acesso: z.enum(["pendente", "aprovado", "revogado"]),
      acesso_expira_em: z.string().optional().or(z.literal("")),
    })
    .safeParse({
      id: formData.get("id"),
      papel: formData.get("papel"),
      status_acesso: formData.get("status_acesso"),
      acesso_expira_em: formData.get("acesso_expira_em") ?? "",
    });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  if (lido.data.acesso_expira_em && !instanteEmFortaleza(lido.data.acesso_expira_em)) {
    return { erro: "Data de expiração inválida." };
  }
  if (lido.data.id === perfil.id && lido.data.papel !== "admin") {
    return { erro: "Você não pode remover o seu próprio papel de administração." };
  }
  if (lido.data.id === perfil.id && lido.data.status_acesso !== "aprovado") {
    return { erro: "Você não pode revogar o seu próprio acesso." };
  }

  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("profiles")
    .update({
      papel: lido.data.papel,
      status_acesso: lido.data.status_acesso,
      acesso_expira_em: instanteEmFortaleza(lido.data.acesso_expira_em),
    })
    .eq("id", lido.data.id);
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };

  if (lido.data.status_acesso === "revogado") {
    await admin
      .from("atribuicoes_auditor")
      .update({
        status: "revogada",
        revogado_em: new Date().toISOString(),
        revogado_por: perfil.id,
        motivo_revogacao: "Acesso do auditor revogado.",
      })
      .eq("auditor_id", lido.data.id)
      .neq("status", "revogada");
  }

  revalidarPainel();
  return { sucesso: "Acesso atualizado." };
}

export async function atribuirAuditoria(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { perfil } = await exigirContexto({ papeis: ["admin"] });
  const lido = z
    .object({
      auditor_id: z.string().uuid(),
      auditoria_id: z.string().uuid(),
      expira_em: z.string().optional().or(z.literal("")),
    })
    .safeParse({
      auditor_id: formData.get("auditor_id"),
      auditoria_id: formData.get("auditoria_id"),
      expira_em: formData.get("expira_em") ?? "",
    });
  if (!lido.success) return { erro: "Selecione o auditor e a auditoria." };
  if (lido.data.expira_em && !instanteEmFortaleza(lido.data.expira_em)) {
    return { erro: "Data de expiração inválida." };
  }

  const admin = criarClienteAdmin();
  const { data: auditor } = await admin.from("profiles").select("papel, status_acesso").eq("id", lido.data.auditor_id).maybeSingle();
  if (!auditor || auditor.papel !== "auditor") return { erro: "A atribuição vale apenas para auditor externo." };
  if (auditor.status_acesso !== "aprovado") {
    return { erro: "Aprove o acesso do auditor antes de atribuir uma auditoria." };
  }

  const { error } = await admin.from("atribuicoes_auditor").upsert(
    {
      auditor_id: lido.data.auditor_id,
      auditoria_id: lido.data.auditoria_id,
      status: "aprovada",
      aprovado_por: perfil.id,
      aprovado_em: new Date().toISOString(),
      expira_em: instanteEmFortaleza(lido.data.expira_em),
      revogado_em: null,
      revogado_por: null,
      motivo_revogacao: null,
    },
    { onConflict: "auditor_id,auditoria_id" },
  );
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: "Auditoria atribuída." };
}

export async function revogarAtribuicao(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { perfil } = await exigirContexto({ papeis: ["admin"] });
  const id = z.string().uuid().safeParse(formData.get("id"));
  const motivo = z.string().trim().min(5, "Informe o motivo da revogação.").max(1000).safeParse(formData.get("motivo"));
  if (!id.success || !motivo.success) return { erro: motivo.success ? "Atribuição inválida." : motivo.error.issues[0].message };

  const admin = criarClienteAdmin();
  const { error } = await admin
    .from("atribuicoes_auditor")
    .update({
      status: "revogada",
      revogado_em: new Date().toISOString(),
      revogado_por: perfil.id,
      motivo_revogacao: motivo.data,
    })
    .eq("id", id.data);
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel();
  return { sucesso: "Atribuição revogada." };
}
