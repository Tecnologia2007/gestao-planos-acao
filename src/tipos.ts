import type { Papel, StatusAcesso } from "@/dominio/acesso";
import type { Atendimento, ResultadoValidacao, StatusPlano } from "@/dominio/atendimento";
import type { NivelEscalonamento, SituacaoAlerta, TipoAlerta } from "@/dominio/alertas";

export type EstadoFormulario = {
  erro?: string;
  sucesso?: string;
  linkConvite?: string;
};

export type Perfil = {
  id: string;
  email: string;
  nome: string;
  papel: Papel;
  status_acesso: StatusAcesso;
  acesso_expira_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Auditoria = {
  id: string;
  codigo: string;
  titulo: string;
  objetivo: string;
  escopo: string;
  criterio: string;
  tipo: string;
  status: string;
  nivel_risco: string;
  unidade: string;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  notas_sigilosas: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Evidencia = {
  id: string;
  plano_acao_id: string;
  descricao: string;
  referencia: string;
  enviado_por: string | null;
  criado_em: string;
};

export type Validacao = {
  id: string;
  plano_acao_id: string;
  resultado: ResultadoValidacao;
  comentario: string | null;
  validado_por: string | null;
  criado_em: string;
  validador?: { id: string; nome: string } | { id: string; nome: string }[] | null;
};

export type Plano = {
  id: string;
  recomendacao_id: string;
  descricao: string;
  responsavel_id: string | null;
  prazo: string;
  status: StatusPlano;
  atendimento: Atendimento;
  justificativa_atendimento: string | null;
  escalonamento: NivelEscalonamento;
  criado_em: string;
  atualizado_em: string;
  responsavel?: { id: string; nome: string; email: string } | { id: string; nome: string; email: string }[] | null;
  evidencias?: Evidencia[] | null;
  validacoes?: Validacao[] | null;
};

export type Recomendacao = {
  id: string;
  constatacao_id: string;
  descricao: string;
  prioridade: string;
  prazo_sugerido: string | null;
  planos_acao?: Plano[] | null;
};

export type Constatacao = {
  id: string;
  auditoria_id: string;
  codigo: string;
  titulo: string;
  criterio: string;
  condicao: string;
  causa: string;
  efeito: string;
  notas_sigilosas: string | null;
  classificacao: string;
  status: string;
  recomendacoes?: Recomendacao[] | null;
};

export type AlertaLinha = {
  id: string;
  plano_acao_id: string;
  tipo: TipoAlerta;
  situacao: SituacaoAlerta;
  dias_restantes: number;
  destinatarios: string[];
  ultimo_erro: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type TrilhaLinha = {
  id: number;
  tabela: string;
  registro_id: string | null;
  operacao: string;
  dados_anteriores: unknown;
  dados_novos: unknown;
  usuario_id: string | null;
  criado_em: string;
};

export type LogAcesso = {
  id: number;
  usuario_id: string | null;
  acao: string;
  recurso: string;
  ip: string;
  agente: string;
  criado_em: string;
};

export type Atribuicao = {
  id: string;
  auditor_id: string;
  auditoria_id: string;
  status: "pendente" | "aprovada" | "revogada";
  expira_em: string | null;
  revogado_em: string | null;
  motivo_revogacao: string | null;
  auditoria?: { codigo: string; titulo: string } | { codigo: string; titulo: string }[] | null;
};
