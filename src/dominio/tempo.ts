export const FUSO_AUDITORIA = "America/Fortaleza";

export function chaveDoDia(data: Date, fuso = FUSO_AUDITORIA): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

export function diferencaDiasCalendario(inicioIso: string, fimIso: string): number {
  const [anoInicio, mesInicio, diaInicio] = inicioIso.slice(0, 10).split("-").map(Number);
  const [anoFim, mesFim, diaFim] = fimIso.slice(0, 10).split("-").map(Number);
  const inicio = Date.UTC(anoInicio, mesInicio - 1, diaInicio);
  const fim = Date.UTC(anoFim, mesFim - 1, diaFim);
  return Math.round((fim - inicio) / 86_400_000);
}

export function diasAtePrazo(prazo: string, agora: Date, fuso = FUSO_AUDITORIA): number {
  return diferencaDiasCalendario(chaveDoDia(agora, fuso), prazo);
}

export function horaNoFuso(agora: Date, fuso = FUSO_AUDITORIA): number {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(agora);
  return Number(partes.find((parte) => parte.type === "hour")?.value ?? "0");
}

export function saudacao(hora: number): string {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function formatarData(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso: string | null | undefined, fuso = FUSO_AUDITORIA): string {
  if (!iso) return "—";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    dateStyle: "short",
    timeStyle: "short",
  }).format(data);
}

/** Interpreta `datetime-local` como horário de Fortaleza (UTC−3, sem horário de verão). */
export function instanteEmFortaleza(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const texto = valor.trim();
  if (!texto) return null;
  const comFuso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)
    ? `${texto}:00-03:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(texto)
      ? `${texto}-03:00`
      : texto;
  const data = new Date(comFuso);
  if (Number.isNaN(data.getTime())) return null;
  return data.toISOString();
}

export function minutosInatividade(valor = process.env.SESSION_INACTIVITY_MINUTES): number {
  const numero = Number(valor ?? 30);
  if (!Number.isFinite(numero) || numero < 5 || numero > 720) return 30;
  return Math.floor(numero);
}
