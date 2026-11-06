import type { Papel } from "@/dominio/acesso";
import type { Atendimento, ResultadoValidacao, StatusPlano } from "@/dominio/atendimento";
import type { NivelEscalonamento, TipoAlerta } from "@/dominio/alertas";

export const ROTULO_PAPEL: Record<Papel, string> = {
  admin: "Administração",
  risco: "Riscos",
  auditor: "Auditor externo",
};

export const ROTULO_STATUS_AUDITORIA: Record<string, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  relatorio: "Relatório",
  acompanhamento: "Em acompanhamento",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export const ROTULO_TIPO_AUDITORIA: Record<string, string> = {
  interna: "Interna",
  externa: "Externa",
  regulatoria: "Regulatória",
  especial: "Especial",
};

export const ROTULO_NIVEL: Record<string, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

export const ROTULO_CLASSIFICACAO: Record<string, string> = {
  oportunidade_melhoria: "Oportunidade de melhoria",
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

export const ROTULO_STATUS_CONSTATACAO: Record<string, string> = {
  aberta: "Aberta",
  em_tratamento: "Em tratamento",
  aguardando_validacao: "Aguardando validação",
  validada: "Validada",
  encerrada: "Encerrada",
  reaberta: "Reaberta",
};

export const ROTULO_PRIORIDADE: Record<string, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};

export const ROTULO_STATUS_PLANO: Record<StatusPlano, string> = {
  nao_iniciado: "Não iniciado",
  em_andamento: "Em andamento",
  aguardando_evidencia: "Aguardando evidência",
  aguardando_validacao: "Aguardando validação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ROTULO_ATENDIMENTO: Record<Atendimento, string> = {
  pendente: "Ainda não avaliado",
  atende_integralmente: "Atende integralmente",
  atende_parcialmente: "Atende parcialmente",
  nao_atende: "Não atende",
};

export const ROTULO_VALIDACAO: Record<ResultadoValidacao, string> = {
  aceita: "Aceita",
  aceita_com_ressalvas: "Aceita com ressalvas",
  rejeitada: "Rejeitada",
};

export const ROTULO_ALERTA: Record<TipoAlerta, string> = {
  d15: "15 dias",
  d7: "7 dias",
  vencido: "Vencido",
};

export const ROTULO_ESCALONAMENTO: Record<NivelEscalonamento, string> = {
  nenhum: "Sem escalonamento",
  responsavel: "Responsável",
  risco: "Área de riscos",
  admin: "Administração",
};

export const ROTULO_STATUS_ACESSO: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  revogado: "Revogado",
};

export const ROTULO_ATRIBUICAO: Record<string, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  revogada: "Revogada",
};

export function rotulo(mapa: Record<string, string>, chave: string | null | undefined): string {
  if (!chave) return "—";
  return mapa[chave] ?? chave;
}
