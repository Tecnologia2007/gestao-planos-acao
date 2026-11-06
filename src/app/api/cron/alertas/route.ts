import { NextResponse } from "next/server";
import { segredoConfere, type SituacaoAlerta, type TipoAlerta } from "@/dominio/alertas";
import { mapearPlanoCron, type LinhaPlanoCron } from "@/dominio/mapear-plano";
import { processarAlertas, type ReservaAlerta } from "@/dominio/processar-alertas";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { enviarEmail } from "@/servidor/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function executar(request: Request) {
  if (!segredoConfere(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    const admin = criarClienteAdmin();
    const resumo = await processarAlertas({
      agora: new Date(),
      urlBase: process.env.NEXT_PUBLIC_APP_URL,
      async listarPlanos() {
        const { data, error } = await admin.from("planos_acao").select(`
          id, prazo, status, descricao,
          responsavel:profiles!planos_acao_responsavel_id_fkey(email),
          recomendacoes (
            descricao,
            constatacoes (
              codigo,
              auditorias (id, codigo, titulo)
            )
          )
        `);
        if (error) throw new Error(error.message);
        return (data ?? [])
          .map((linha) => mapearPlanoCron(linha as LinhaPlanoCron))
          .filter((plano): plano is NonNullable<typeof plano> => plano !== null);
      },
      async listarAlertas() {
        const { data, error } = await admin.from("alertas").select("plano_acao_id, tipo, situacao");
        if (error) throw new Error(error.message);
        return (data ?? []) as { plano_acao_id: string; tipo: TipoAlerta; situacao: SituacaoAlerta }[];
      },
      async listarDestinatarios(plano) {
        const { data } = await admin.from("profiles").select("email").eq("papel", "admin").eq("status_acesso", "aprovado");
        const admins = (data ?? []).map((perfil) => perfil.email as string);
        return [plano.responsavelEmail, ...admins, process.env.ADMIN_EMAIL];
      },
      async reservar(planoId, tipo, dias): Promise<ReservaAlerta> {
        const { data: atual } = await admin
          .from("alertas")
          .select("situacao")
          .eq("plano_acao_id", planoId)
          .eq("tipo", tipo)
          .maybeSingle();
        if (atual?.situacao === "enviado") return "ignorar";
        if (atual) return "reenviar";
        const { error } = await admin.from("alertas").insert({
          plano_acao_id: planoId,
          tipo,
          situacao: "pendente",
          dias_restantes: dias,
          destinatarios: [],
        });
        if (error?.code === "23505") return "ignorar";
        if (error) throw new Error(error.message);
        return "nova";
      },
      async marcarEnviado(planoId, tipo, destinatarios, mensagemId) {
        const { error } = await admin
          .from("alertas")
          .update({
            situacao: "enviado",
            destinatarios,
            mensagem_id: mensagemId,
            ultimo_erro: null,
          })
          .eq("plano_acao_id", planoId)
          .eq("tipo", tipo);
        if (error) throw new Error(error.message);
      },
      async marcarErro(planoId, tipo, erro) {
        await admin
          .from("alertas")
          .update({ situacao: "erro", ultimo_erro: erro.slice(0, 500) })
          .eq("plano_acao_id", planoId)
          .eq("tipo", tipo);
      },
      async atualizarEscalonamento(planoId, nivel) {
        await admin.from("planos_acao").update({ escalonamento: nivel }).eq("id", planoId);
      },
      enviar: enviarEmail,
    });
    return NextResponse.json(resumo);
  } catch {
    return NextResponse.json({ erro: "Falha ao processar alertas" }, { status: 500 });
  }
}

export function GET(request: Request) {
  return executar(request);
}

export function POST(request: Request) {
  return executar(request);
}
