import type { TipoAlerta } from "@/dominio/alertas";
import { formatarData } from "@/dominio/tempo";

export function escaparHtml(valor: string): string {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function resumir(texto: string, limite = 280): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  if (limpo.length <= limite) return limpo;
  return `${limpo.slice(0, limite - 1)}…`;
}

export function urlAplicacao(base: string | undefined, caminho: string): string {
  const raiz = (base ?? "").replace(/\/$/, "");
  const sufixo = caminho.startsWith("/") ? caminho : `/${caminho}`;
  return raiz ? `${raiz}${sufixo}` : sufixo;
}

const TITULO: Record<TipoAlerta, string> = {
  d15: "vence em até 15 dias",
  d7: "vence em até 7 dias",
  vencido: "está vencido",
};

export type DadosMensagemAlerta = {
  tipo: TipoAlerta;
  dias: number;
  prazo: string;
  auditoriaCodigo: string;
  auditoriaTitulo: string;
  constatacaoCodigo: string;
  descricaoPlano: string;
  link: string;
};

export function redigirAlerta(dados: DadosMensagemAlerta): { assunto: string; html: string; texto: string } {
  const quando =
    dados.dias < 0
      ? `vencido há ${Math.abs(dados.dias)} dia(s)`
      : dados.dias === 0
        ? "vence hoje"
        : `vence em ${dados.dias} dia(s)`;
  const assunto = `[Cicobi] Plano ${TITULO[dados.tipo]} · ${dados.auditoriaCodigo}`;
  const descricao = resumir(dados.descricaoPlano);
  const prazo = formatarData(dados.prazo);
  const texto = [
    `O plano de ação da auditoria ${dados.auditoriaCodigo} (${dados.auditoriaTitulo}), constatação ${dados.constatacaoCodigo}, ${quando}.`,
    `Prazo: ${prazo}.`,
    `Plano: ${descricao}`,
    `Acompanhe em ${dados.link}.`,
    "Mensagem automática. Não responda com dados sigilosos por e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;color:#1c1915;line-height:1.5">
      <p style="margin:0 0 12px">O plano de ação da auditoria <strong>${escaparHtml(dados.auditoriaCodigo)}</strong>
      (${escaparHtml(dados.auditoriaTitulo)}), constatação <strong>${escaparHtml(dados.constatacaoCodigo)}</strong>, ${escaparHtml(quando)}.</p>
      <p style="margin:0 0 12px">Prazo: <strong>${escaparHtml(prazo)}</strong>.</p>
      <p style="margin:0 0 12px">${escaparHtml(descricao)}</p>
      <p style="margin:0 0 12px"><a href="${escaparHtml(dados.link)}">Abrir o plano no sistema</a></p>
      <p style="margin:0;color:#6d645b;font-size:13px">Mensagem automática da Central de Auditorias. Não responda com dados sigilosos por e-mail.</p>
    </div>
  `.trim();

  return { assunto, html, texto };
}
