import {
  chaveAlerta,
  escalonamentoDoAlerta,
  normalizarEmails,
  selecionarAlertas,
  type AlertaRegistrado,
  type NivelEscalonamento,
  type PlanoAvaliado,
  type TipoAlerta,
} from "@/dominio/alertas";
import { redigirAlerta, urlAplicacao } from "@/dominio/mensagem-alerta";

export type PlanoParaAlerta = PlanoAvaliado & {
  descricao: string;
  responsavelEmail: string | null;
  auditoriaId: string;
  auditoriaCodigo: string;
  auditoriaTitulo: string;
  constatacaoCodigo: string;
};

export type ReservaAlerta = "nova" | "reenviar" | "ignorar";

export type ResumoAlertas = {
  enviados: number;
  ignorados: number;
  erros: number;
  candidatos: number;
};

export type DependenciasAlertas = {
  agora: Date;
  urlBase?: string;
  listarPlanos: () => Promise<PlanoParaAlerta[]>;
  listarAlertas: () => Promise<AlertaRegistrado[]>;
  listarDestinatarios: (plano: PlanoParaAlerta) => Promise<Array<string | null | undefined>>;
  reservar: (planoId: string, tipo: TipoAlerta, dias: number) => Promise<ReservaAlerta>;
  marcarEnviado: (
    planoId: string,
    tipo: TipoAlerta,
    destinatarios: string[],
    mensagemId: string | null,
  ) => Promise<void>;
  marcarErro: (planoId: string, tipo: TipoAlerta, erro: string) => Promise<void>;
  atualizarEscalonamento: (planoId: string, nivel: NivelEscalonamento) => Promise<void>;
  enviar: (entrada: {
    destinatarios: string[];
    assunto: string;
    html: string;
    texto: string;
    chaveIdempotencia: string;
  }) => Promise<{ ok: boolean; id?: string; erro?: string }>;
};

export async function processarAlertas(deps: DependenciasAlertas): Promise<ResumoAlertas> {
  const [planos, existentes] = await Promise.all([deps.listarPlanos(), deps.listarAlertas()]);
  const selecionados = selecionarAlertas(planos, deps.agora, existentes);
  const resumo: ResumoAlertas = {
    enviados: 0,
    ignorados: 0,
    erros: 0,
    candidatos: selecionados.length,
  };

  for (const item of selecionados) {
    const reserva = await deps.reservar(item.plano.id, item.tipo, item.dias);
    if (reserva === "ignorar") {
      resumo.ignorados += 1;
      continue;
    }

    const destinatarios = normalizarEmails(await deps.listarDestinatarios(item.plano));
    if (destinatarios.length === 0) {
      await deps.marcarErro(item.plano.id, item.tipo, "Nenhum destinatário");
      resumo.erros += 1;
      continue;
    }

    const mensagem = redigirAlerta({
      tipo: item.tipo,
      dias: item.dias,
      prazo: item.plano.prazo,
      auditoriaCodigo: item.plano.auditoriaCodigo,
      auditoriaTitulo: item.plano.auditoriaTitulo,
      constatacaoCodigo: item.plano.constatacaoCodigo,
      descricaoPlano: item.plano.descricao,
      link: urlAplicacao(deps.urlBase, `/auditorias/${item.plano.auditoriaId}`),
    });

    try {
      const envio = await deps.enviar({
        destinatarios,
        assunto: mensagem.assunto,
        html: mensagem.html,
        texto: mensagem.texto,
        chaveIdempotencia: chaveAlerta(item.plano.id, item.tipo),
      });
      if (!envio.ok) {
        await deps.marcarErro(item.plano.id, item.tipo, envio.erro ?? "Falha no envio");
        resumo.erros += 1;
        continue;
      }
      await deps.marcarEnviado(item.plano.id, item.tipo, destinatarios, envio.id ?? null);
      await deps.atualizarEscalonamento(item.plano.id, escalonamentoDoAlerta(item.tipo));
      resumo.enviados += 1;
    } catch (erro) {
      const mensagemErro = erro instanceof Error ? erro.message : "Falha no envio";
      await deps.marcarErro(item.plano.id, item.tipo, mensagemErro);
      resumo.erros += 1;
    }
  }

  return resumo;
}
