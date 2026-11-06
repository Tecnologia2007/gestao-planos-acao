import "server-only";
import { Resend } from "resend";
import { distribuirDestinatarios } from "@/dominio/alertas";

export async function enviarEmail(entrada: {
  destinatarios: string[];
  assunto: string;
  html: string;
  texto: string;
  chaveIdempotencia?: string;
}): Promise<{ ok: boolean; id?: string; erro?: string }> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.RESEND_FROM_EMAIL;
  if (!chave || !remetente) {
    return { ok: false, erro: "O Resend não está configurado." };
  }
  const distribuicao = distribuirDestinatarios(entrada.destinatarios);
  if (!distribuicao) return { ok: false, erro: "Nenhum destinatário" };

  const resend = new Resend(chave);
  const { data, error } = await resend.emails.send(
    {
      from: remetente,
      to: distribuicao.para,
      bcc: distribuicao.copiaOculta.length > 0 ? distribuicao.copiaOculta : undefined,
      subject: entrada.assunto,
      html: entrada.html,
      text: entrada.texto,
    },
    entrada.chaveIdempotencia ? { idempotencyKey: entrada.chaveIdempotencia } : undefined,
  );
  if (error) return { ok: false, erro: error.message };
  return { ok: true, id: data?.id };
}
