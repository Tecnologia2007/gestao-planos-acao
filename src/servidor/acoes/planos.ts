"use server";

import { z } from "zod";
import {
  autoValidacao,
  comentarioValidacaoValido,
  justificativaValida,
  podeValidar,
  statusAoAnexarEvidencia,
  statusAposValidacao,
  type Atendimento,
  type ResultadoValidacao,
  type StatusPlano,
} from "@/dominio/atendimento";
import { prazoAlteradoExigeNovoCiclo } from "@/dominio/alertas";
import { traduzirErroBanco } from "@/dominio/erros";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { revalidarPainel } from "@/servidor/revalidar";
import { exigirContexto } from "@/servidor/sessao";
import type { EstadoFormulario } from "@/tipos";

const esquemaPlano = z.object({
  auditoria_id: z.string().uuid(),
  recomendacao_id: z.string().uuid(),
  descricao: z.string().trim().min(10, "Descreva o plano com pelo menos 10 caracteres.").max(4000),
  responsavel_id: z.string().uuid().optional().or(z.literal("")),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo."),
  status: z.enum([
    "nao_iniciado",
    "em_andamento",
    "aguardando_evidencia",
    "aguardando_validacao",
    "concluido",
    "cancelado",
  ]),
  atendimento: z.enum(["pendente", "atende_integralmente", "atende_parcialmente", "nao_atende"]),
  justificativa_atendimento: z.string().max(4000).optional().default(""),
});

function lerPlano(formData: FormData) {
  return esquemaPlano.safeParse({
    auditoria_id: formData.get("auditoria_id"),
    recomendacao_id: formData.get("recomendacao_id"),
    descricao: formData.get("descricao"),
    responsavel_id: formData.get("responsavel_id") ?? "",
    prazo: formData.get("prazo"),
    status: formData.get("status"),
    atendimento: formData.get("atendimento"),
    justificativa_atendimento: formData.get("justificativa_atendimento") ?? "",
  });
}

async function reiniciarAlertas(planoId: string) {
  const admin = criarClienteAdmin();
  const { error } = await admin.from("alertas").delete().eq("plano_acao_id", planoId);
  if (error) throw new Error("Não foi possível reiniciar os alertas deste prazo.");
}

export async function salvarPlano(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = lerPlano(formData);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  if (!justificativaValida(lido.data.atendimento as Atendimento, lido.data.justificativa_atendimento)) {
    return {
      erro: "Quando o plano não atende integralmente, registre uma justificativa com pelo menos 10 caracteres.",
    };
  }

  const existente = z.string().uuid().safeParse(formData.get("id"));
  let prazoAnterior: string | null = null;
  if (existente.success) {
    const { data: atual } = await supabase.from("planos_acao").select("prazo").eq("id", existente.data).maybeSingle();
    prazoAnterior = (atual?.prazo as string | undefined) ?? null;
    if (prazoAnterior && prazoAlteradoExigeNovoCiclo(prazoAnterior, lido.data.prazo)) {
      try {
        await reiniciarAlertas(existente.data);
      } catch (erro) {
        return { erro: erro instanceof Error ? erro.message : "Falha ao reiniciar alertas." };
      }
    }
  }

  const payload = {
    recomendacao_id: lido.data.recomendacao_id,
    descricao: lido.data.descricao,
    responsavel_id: lido.data.responsavel_id || null,
    prazo: lido.data.prazo,
    status: lido.data.status as StatusPlano,
    atendimento: lido.data.atendimento as Atendimento,
    justificativa_atendimento: lido.data.justificativa_atendimento.trim() || null,
  };

  const { error } = existente.success
    ? await supabase.from("planos_acao").update(payload).eq("id", existente.data)
    : await supabase.from("planos_acao").insert({ ...payload, criado_por: perfil.id });

  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: existente.success ? "Plano atualizado." : "Plano de ação registrado." };
}

export async function salvarEvidencia(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = z
    .object({
      auditoria_id: z.string().uuid(),
      plano_acao_id: z.string().uuid(),
      descricao: z.string().trim().min(5, "Descreva a evidência.").max(4000),
      referencia: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse({
      auditoria_id: formData.get("auditoria_id"),
      plano_acao_id: formData.get("plano_acao_id"),
      descricao: formData.get("descricao"),
      referencia: formData.get("referencia") ?? "",
    });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };

  const { data: plano, error: erroPlano } = await supabase
    .from("planos_acao")
    .select("status")
    .eq("id", lido.data.plano_acao_id)
    .maybeSingle();
  if (erroPlano || !plano) return { erro: "Plano não encontrado." };

  const { error } = await supabase.from("evidencias").insert({
    plano_acao_id: lido.data.plano_acao_id,
    descricao: lido.data.descricao,
    referencia: lido.data.referencia,
    enviado_por: perfil.id,
  });
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };

  const proximo = statusAoAnexarEvidencia(plano.status as StatusPlano);
  if (proximo !== plano.status) {
    await supabase.from("planos_acao").update({ status: proximo }).eq("id", lido.data.plano_acao_id);
  }
  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: "Evidência registrada." };
}

export async function salvarValidacao(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = z
    .object({
      auditoria_id: z.string().uuid(),
      plano_acao_id: z.string().uuid(),
      resultado: z.enum(["aceita", "aceita_com_ressalvas", "rejeitada"]),
      comentario: z.string().max(4000).optional().default(""),
    })
    .safeParse({
      auditoria_id: formData.get("auditoria_id"),
      plano_acao_id: formData.get("plano_acao_id"),
      resultado: formData.get("resultado"),
      comentario: formData.get("comentario") ?? "",
    });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };
  const resultado = lido.data.resultado as ResultadoValidacao;
  if (!comentarioValidacaoValido(resultado, lido.data.comentario)) {
    return { erro: "Recusa e aceitação com ressalvas exigem um comentário de pelo menos 10 caracteres." };
  }

  const { data: plano } = await supabase
    .from("planos_acao")
    .select("responsavel_id, status")
    .eq("id", lido.data.plano_acao_id)
    .maybeSingle();
  if (!plano) return { erro: "Plano não encontrado." };
  if (autoValidacao(plano.responsavel_id as string | null, perfil.id)) {
    return { erro: "Quem é responsável pelo plano não valida a própria entrega." };
  }

  const { count } = await supabase
    .from("evidencias")
    .select("id", { count: "exact", head: true })
    .eq("plano_acao_id", lido.data.plano_acao_id);
  if (!podeValidar(resultado, count ?? 0)) {
    return { erro: "Para aceitar o plano, registre ao menos uma evidência." };
  }

  const { error } = await supabase.from("validacoes").insert({
    plano_acao_id: lido.data.plano_acao_id,
    resultado,
    comentario: lido.data.comentario.trim() || null,
    validado_por: perfil.id,
  });
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };

  const { error: erroStatus } = await supabase
    .from("planos_acao")
    .update({ status: statusAposValidacao(resultado) })
    .eq("id", lido.data.plano_acao_id);
  if (erroStatus) return { erro: traduzirErroBanco(erroStatus.message, erroStatus.code) };

  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: "Validação registrada." };
}
