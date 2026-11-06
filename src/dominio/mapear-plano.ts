import type { PlanoParaAlerta } from "@/dominio/processar-alertas";

function comoObjeto<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type Relacao = {
  email?: string | null;
  descricao?: string | null;
  codigo?: string | null;
  titulo?: string | null;
  id?: string | null;
  constatacoes?: Relacao | Relacao[] | null;
  auditorias?: Relacao | Relacao[] | null;
};

export type LinhaPlanoCron = {
  id?: string;
  prazo?: string;
  status?: string;
  descricao?: string;
  responsavel?: Relacao | Relacao[] | null;
  recomendacoes?: Relacao | Relacao[] | null;
};

export function mapearPlanoCron(linha: LinhaPlanoCron): PlanoParaAlerta | null {
  if (!linha.id || !linha.prazo || !linha.status || !linha.descricao) return null;
  const recomendacao = comoObjeto(linha.recomendacoes);
  const constatacao = comoObjeto(recomendacao?.constatacoes);
  const auditoria = comoObjeto(constatacao?.auditorias);
  const responsavel = comoObjeto(linha.responsavel);
  if (!auditoria?.id || !auditoria.codigo || !constatacao?.codigo) return null;
  return {
    id: linha.id,
    prazo: linha.prazo,
    status: linha.status,
    descricao: linha.descricao,
    responsavelEmail: responsavel?.email ?? null,
    auditoriaId: auditoria.id,
    auditoriaCodigo: auditoria.codigo,
    auditoriaTitulo: auditoria.titulo ?? auditoria.codigo,
    constatacaoCodigo: constatacao.codigo,
  };
}
