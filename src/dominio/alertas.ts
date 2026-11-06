import { diasAtePrazo } from "@/dominio/tempo";
import { planoEncerrado, type StatusPlano } from "@/dominio/atendimento";

export const JANELA_D15 = 15;
export const JANELA_D7 = 7;

export type TipoAlerta = "d15" | "d7" | "vencido";
export type SituacaoAlerta = "pendente" | "enviado" | "erro";
export type NivelEscalonamento = "nenhum" | "responsavel" | "risco" | "admin";

export type PlanoAvaliado = {
  id: string;
  prazo: string;
  status: StatusPlano | string;
};

export type AlertaRegistrado = {
  plano_acao_id: string;
  tipo: TipoAlerta;
  situacao: SituacaoAlerta;
};

export type AlertaSelecionado<T extends PlanoAvaliado = PlanoAvaliado> = {
  plano: T;
  tipo: TipoAlerta;
  dias: number;
  reenvio: boolean;
};

export function tipoAlertaAplicavel(dias: number): TipoAlerta | null {
  if (dias < 0) return "vencido";
  if (dias <= JANELA_D7) return "d7";
  if (dias <= JANELA_D15) return "d15";
  return null;
}

export function escalonamentoDoAlerta(tipo: TipoAlerta): NivelEscalonamento {
  if (tipo === "vencido") return "admin";
  if (tipo === "d7") return "risco";
  return "responsavel";
}

export function chaveAlerta(planoId: string, tipo: TipoAlerta): string {
  return `${planoId}:${tipo}`;
}

export function prazoAlteradoExigeNovoCiclo(prazoAnterior: string, prazoNovo: string): boolean {
  return prazoAnterior.slice(0, 10) !== prazoNovo.slice(0, 10);
}

export function faixaDoPrazo(dias: number): "vencido" | "d7" | "d15" | "folga" {
  const tipo = tipoAlertaAplicavel(dias);
  return tipo ?? "folga";
}

export function selecionarAlertas<T extends PlanoAvaliado>(
  planos: T[],
  agora: Date,
  enviados: AlertaRegistrado[],
): AlertaSelecionado<T>[] {
  const porPlano = new Map<string, Map<TipoAlerta, SituacaoAlerta>>();
  for (const item of enviados) {
    const tipos = porPlano.get(item.plano_acao_id) ?? new Map<TipoAlerta, SituacaoAlerta>();
    tipos.set(item.tipo, item.situacao);
    porPlano.set(item.plano_acao_id, tipos);
  }

  const saida: AlertaSelecionado<T>[] = [];
  for (const plano of planos) {
    if (planoEncerrado(plano.status as StatusPlano)) continue;
    const dias = diasAtePrazo(plano.prazo, agora);
    const tipo = tipoAlertaAplicavel(dias);
    if (!tipo) continue;
    const situacao = porPlano.get(plano.id)?.get(tipo);
    if (situacao === "enviado") continue;
    saida.push({
      plano,
      tipo,
      dias,
      reenvio: situacao === "erro" || situacao === "pendente",
    });
  }
  return saida;
}

export function normalizarEmails(emails: Array<string | null | undefined>): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const email of emails) {
    if (!email) continue;
    const limpo = email.trim().toLowerCase();
    if (!limpo.includes("@") || limpo.startsWith("@") || limpo.endsWith("@")) continue;
    if (vistos.has(limpo)) continue;
    vistos.add(limpo);
    saida.push(limpo);
  }
  return saida;
}

export function distribuirDestinatarios(emails: string[]): { para: string; copiaOculta: string[] } | null {
  if (emails.length === 0) return null;
  return { para: emails[0], copiaOculta: emails.slice(1) };
}

export function segredoConfere(cabecalho: string | null, segredo: string | undefined): boolean {
  if (!segredo || segredo.length < 16) return false;
  const token = (cabecalho ?? "").replace(/^Bearer\s+/i, "").trim();
  if (token.length !== segredo.length) return false;
  let diferenca = 0;
  for (let indice = 0; indice < token.length; indice += 1) {
    diferenca |= token.charCodeAt(indice) ^ segredo.charCodeAt(indice);
  }
  return diferenca === 0;
}
