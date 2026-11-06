"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prepararCampoSigiloso } from "@/dominio/cripto";
import { traduzirErroBanco } from "@/dominio/erros";
import { revalidarPainel } from "@/servidor/revalidar";
import { exigirContexto } from "@/servidor/sessao";
import type { EstadoFormulario } from "@/tipos";

const esquemaAuditoria = z.object({
  codigo: z.string().trim().min(3, "Informe um código com pelo menos 3 caracteres.").max(40),
  titulo: z.string().trim().min(5, "O título precisa ter pelo menos 5 caracteres.").max(200),
  objetivo: z.string().trim().max(4000).optional().default(""),
  escopo: z.string().trim().max(4000).optional().default(""),
  criterio: z.string().trim().max(2000).optional().default(""),
  tipo: z.enum(["interna", "externa", "regulatoria", "especial"]),
  status: z.enum(["planejada", "em_andamento", "relatorio", "acompanhamento", "encerrada", "cancelada"]),
  nivel_risco: z.enum(["baixo", "medio", "alto", "critico"]),
  unidade: z.string().trim().max(160).optional().default(""),
  periodo_inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  periodo_fim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  notas_sigilosas: z.string().max(5000).optional().default(""),
});

function lerAuditoria(formData: FormData) {
  return esquemaAuditoria.safeParse({
    codigo: formData.get("codigo"),
    titulo: formData.get("titulo"),
    objetivo: formData.get("objetivo") ?? "",
    escopo: formData.get("escopo") ?? "",
    criterio: formData.get("criterio") ?? "",
    tipo: formData.get("tipo"),
    status: formData.get("status"),
    nivel_risco: formData.get("nivel_risco"),
    unidade: formData.get("unidade") ?? "",
    periodo_inicio: formData.get("periodo_inicio") ?? "",
    periodo_fim: formData.get("periodo_fim") ?? "",
    notas_sigilosas: formData.get("notas_sigilosas") ?? "",
  });
}

function dataOuNulo(valor: string | undefined) {
  return valor ? valor : null;
}

export async function criarAuditoria(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = lerAuditoria(formData);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };

  let notas: string | null = null;
  try {
    notas = prepararCampoSigiloso(lido.data.notas_sigilosas, process.env.ENCRYPTION_KEY);
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao cifrar as notas." };
  }

  const { data, error } = await supabase
    .from("auditorias")
    .insert({
      codigo: lido.data.codigo,
      titulo: lido.data.titulo,
      objetivo: lido.data.objetivo,
      escopo: lido.data.escopo,
      criterio: lido.data.criterio,
      tipo: lido.data.tipo,
      status: lido.data.status,
      nivel_risco: lido.data.nivel_risco,
      unidade: lido.data.unidade,
      periodo_inicio: dataOuNulo(lido.data.periodo_inicio),
      periodo_fim: dataOuNulo(lido.data.periodo_fim),
      notas_sigilosas: notas,
      criado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !data) return { erro: traduzirErroBanco(error?.message ?? "", error?.code) };
  revalidarPainel(data.id);
  redirect(`/auditorias/${data.id}`);
}

export async function atualizarAuditoria(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase } = await exigirContexto({ escrever: true });
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return { erro: "Auditoria inválida." };
  const lido = lerAuditoria(formData);
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };

  const preservar = formData.get("preservar_notas") === "1";
  let notas: string | null = null;
  if (!preservar) {
    try {
      notas = prepararCampoSigiloso(lido.data.notas_sigilosas, process.env.ENCRYPTION_KEY);
    } catch (erro) {
      return { erro: erro instanceof Error ? erro.message : "Falha ao cifrar as notas." };
    }
  }

  const { error } = await supabase
    .from("auditorias")
    .update({
      codigo: lido.data.codigo,
      titulo: lido.data.titulo,
      objetivo: lido.data.objetivo,
      escopo: lido.data.escopo,
      criterio: lido.data.criterio,
      tipo: lido.data.tipo,
      status: lido.data.status,
      nivel_risco: lido.data.nivel_risco,
      unidade: lido.data.unidade,
      periodo_inicio: dataOuNulo(lido.data.periodo_inicio),
      periodo_fim: dataOuNulo(lido.data.periodo_fim),
      ...(preservar ? {} : { notas_sigilosas: notas }),
    })
    .eq("id", id.data);

  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel(id.data);
  return { sucesso: "Auditoria atualizada." };
}

const esquemaConstatacao = z.object({
  auditoria_id: z.string().uuid(),
  codigo: z.string().trim().min(1).max(20),
  titulo: z.string().trim().min(5, "O título da constatação precisa ter pelo menos 5 caracteres.").max(200),
  criterio: z.string().trim().max(4000).optional().default(""),
  condicao: z.string().trim().max(8000).optional().default(""),
  causa: z.string().trim().max(4000).optional().default(""),
  efeito: z.string().trim().max(4000).optional().default(""),
  classificacao: z.enum(["oportunidade_melhoria", "baixa", "media", "alta", "critica"]),
  status: z.enum(["aberta", "em_tratamento", "aguardando_validacao", "validada", "encerrada", "reaberta"]),
  notas_sigilosas: z.string().max(5000).optional().default(""),
});

export async function salvarConstatacao(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = esquemaConstatacao.safeParse({
    auditoria_id: formData.get("auditoria_id"),
    codigo: formData.get("codigo"),
    titulo: formData.get("titulo"),
    criterio: formData.get("criterio") ?? "",
    condicao: formData.get("condicao") ?? "",
    causa: formData.get("causa") ?? "",
    efeito: formData.get("efeito") ?? "",
    classificacao: formData.get("classificacao"),
    status: formData.get("status"),
    notas_sigilosas: formData.get("notas_sigilosas") ?? "",
  });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };

  const preservar = formData.get("preservar_notas") === "1";
  let notas: string | null = null;
  if (!preservar) {
    try {
      notas = prepararCampoSigiloso(lido.data.notas_sigilosas, process.env.ENCRYPTION_KEY);
    } catch (erro) {
      return { erro: erro instanceof Error ? erro.message : "Falha ao cifrar as notas." };
    }
  }

  const payload = {
    auditoria_id: lido.data.auditoria_id,
    codigo: lido.data.codigo,
    titulo: lido.data.titulo,
    criterio: lido.data.criterio,
    condicao: lido.data.condicao,
    causa: lido.data.causa,
    efeito: lido.data.efeito,
    classificacao: lido.data.classificacao,
    status: lido.data.status,
    ...(preservar ? {} : { notas_sigilosas: notas }),
  };

  const existente = z.string().uuid().safeParse(formData.get("id"));
  const { error } = existente.success
    ? await supabase.from("constatacoes").update(payload).eq("id", existente.data)
    : await supabase.from("constatacoes").insert({ ...payload, notas_sigilosas: notas, criado_por: perfil.id });

  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: existente.success ? "Constatação atualizada." : "Constatação registrada." };
}

const esquemaRecomendacao = z.object({
  auditoria_id: z.string().uuid(),
  constatacao_id: z.string().uuid(),
  descricao: z.string().trim().min(10, "Descreva a recomendação com pelo menos 10 caracteres.").max(4000),
  prioridade: z.enum(["baixa", "media", "alta", "urgente"]),
  prazo_sugerido: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
});

export async function salvarRecomendacao(_estado: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  const { supabase, perfil } = await exigirContexto({ escrever: true });
  const lido = esquemaRecomendacao.safeParse({
    auditoria_id: formData.get("auditoria_id"),
    constatacao_id: formData.get("constatacao_id"),
    descricao: formData.get("descricao"),
    prioridade: formData.get("prioridade"),
    prazo_sugerido: formData.get("prazo_sugerido") ?? "",
  });
  if (!lido.success) return { erro: lido.error.issues[0]?.message ?? "Dados inválidos." };

  const { error } = await supabase.from("recomendacoes").insert({
    constatacao_id: lido.data.constatacao_id,
    descricao: lido.data.descricao,
    prioridade: lido.data.prioridade,
    prazo_sugerido: lido.data.prazo_sugerido || null,
    criado_por: perfil.id,
  });
  if (error) return { erro: traduzirErroBanco(error.message, error.code) };
  revalidarPainel(lido.data.auditoria_id);
  return { sucesso: "Recomendação registrada." };
}
