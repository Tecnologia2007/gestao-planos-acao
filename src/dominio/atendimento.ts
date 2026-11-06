export const ATENDIMENTOS = [
  "pendente",
  "atende_integralmente",
  "atende_parcialmente",
  "nao_atende",
] as const;

export type Atendimento = (typeof ATENDIMENTOS)[number];

export const STATUS_PLANO = [
  "nao_iniciado",
  "em_andamento",
  "aguardando_evidencia",
  "aguardando_validacao",
  "concluido",
  "cancelado",
] as const;

export type StatusPlano = (typeof STATUS_PLANO)[number];
export type ResultadoValidacao = "aceita" | "aceita_com_ressalvas" | "rejeitada";

const FINALIZADOS = new Set<StatusPlano>(["concluido", "cancelado"]);

export function justificativaValida(atendimento: Atendimento, justificativa: string | null | undefined): boolean {
  if (atendimento === "pendente" || atendimento === "atende_integralmente") return true;
  return Boolean(justificativa && justificativa.trim().length >= 10);
}

export function comentarioValidacaoValido(
  resultado: ResultadoValidacao,
  comentario: string | null | undefined,
): boolean {
  if (resultado === "aceita") return true;
  return Boolean(comentario && comentario.trim().length >= 10);
}

export function podeValidar(resultado: ResultadoValidacao, quantidadeEvidencias: number): boolean {
  if (resultado === "rejeitada") return true;
  return quantidadeEvidencias > 0;
}

export function autoValidacao(responsavelId: string | null, validadorId: string): boolean {
  return Boolean(responsavelId) && responsavelId === validadorId;
}

export function statusAposValidacao(resultado: ResultadoValidacao): StatusPlano {
  if (resultado === "rejeitada") return "em_andamento";
  return "concluido";
}

export function statusAoAnexarEvidencia(statusAtual: StatusPlano): StatusPlano {
  if (FINALIZADOS.has(statusAtual)) return statusAtual;
  return "aguardando_validacao";
}

export function planoEncerrado(status: StatusPlano): boolean {
  return FINALIZADOS.has(status);
}
