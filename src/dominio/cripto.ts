import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const VERSAO = "v1";
const SAL = "cicobi-central-nordeste";

export function derivarChave(segredo: string): Buffer {
  if (segredo.length < 16) {
    throw new Error("Chave de criptografia curta demais");
  }
  return scryptSync(segredo, SAL, 32);
}

export function cifrarTexto(texto: string, segredo: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", derivarChave(segredo), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const etiqueta = cipher.getAuthTag();
  return [VERSAO, iv.toString("base64url"), etiqueta.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decifrarTexto(payload: string, segredo: string): string {
  const [versao, ivB64, etiquetaB64, dadosB64] = payload.split(".");
  if (versao !== VERSAO || !ivB64 || !etiquetaB64 || !dadosB64) {
    throw new Error("Formato de cifra desconhecido");
  }
  const decipher = createDecipheriv("aes-256-gcm", derivarChave(segredo), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(etiquetaB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dadosB64, "base64url")), decipher.final()]).toString("utf8");
}

export function pareceCifrado(valor: string | null | undefined): boolean {
  return Boolean(valor && /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(valor));
}

export type CampoSigiloso = { texto: string | null; aviso: string | null };

export function abrirCampoSigiloso(valor: string | null | undefined, segredo: string | undefined): CampoSigiloso {
  if (!valor) return { texto: null, aviso: null };
  if (!pareceCifrado(valor)) return { texto: valor, aviso: null };
  if (!segredo) return { texto: null, aviso: "Chave de criptografia ausente no servidor." };
  try {
    return { texto: decifrarTexto(valor, segredo), aviso: null };
  } catch {
    return { texto: null, aviso: "Não foi possível ler o campo sigiloso." };
  }
}

export function prepararCampoSigiloso(valor: string | null | undefined, segredo: string | undefined): string | null {
  const texto = valor?.trim() ?? "";
  if (!texto) return null;
  if (!segredo || segredo.length < 16) {
    throw new Error("Defina ENCRYPTION_KEY no servidor antes de gravar notas sigilosas.");
  }
  return cifrarTexto(texto, segredo);
}
