import { describe, expect, it } from "vitest";
import {
  chaveAlerta,
  distribuirDestinatarios,
  escalonamentoDoAlerta,
  faixaDoPrazo,
  normalizarEmails,
  prazoAlteradoExigeNovoCiclo,
  segredoConfere,
  selecionarAlertas,
  tipoAlertaAplicavel,
} from "@/dominio/alertas";
import { chaveDoDia, diasAtePrazo, formatarData, horaNoFuso, instanteEmFortaleza, minutosInatividade, saudacao } from "@/dominio/tempo";
import { escaparHtml, redigirAlerta, resumir } from "@/dominio/mensagem-alerta";
import { processarAlertas, type PlanoParaAlerta, type ReservaAlerta } from "@/dominio/processar-alertas";
import type { AlertaRegistrado } from "@/dominio/alertas";

const agora = new Date("2026-11-06T02:30:00Z");

function plano(parcial: Partial<PlanoParaAlerta> & Pick<PlanoParaAlerta, "id" | "prazo">): PlanoParaAlerta {
  return {
    status: "em_andamento",
    descricao: "Regularizar o registro da garantia antes da liberação.",
    responsavelEmail: "mesa@cicobi.coop.br",
    auditoriaId: "11111111-1111-4111-8111-111111111111",
    auditoriaCodigo: "AUD-2026-014",
    auditoriaTitulo: "Concessão de crédito",
    constatacaoCodigo: "C-01",
    ...parcial,
  };
}

describe("calendário de Fortaleza", () => {
  it("trata a madrugada UTC como o dia anterior no Nordeste", () => {
    expect(chaveDoDia(agora)).toBe("2026-11-05");
    expect(diasAtePrazo("2026-11-20", agora)).toBe(15);
    expect(formatarData("2026-11-20")).toBe("20/11/2026");
  });

  it("escolhe a saudação pela hora local", () => {
    expect(saudacao(horaNoFuso(new Date("2026-11-06T14:00:00Z")))).toBe("Bom dia");
    expect(saudacao(15)).toBe("Boa tarde");
    expect(saudacao(20)).toBe("Boa noite");
  });

  it("lê o relógio de Fortaleza no campo de expiração", () => {
    expect(instanteEmFortaleza("2026-12-01T18:00")).toBe("2026-12-01T21:00:00.000Z");
    expect(instanteEmFortaleza("")).toBeNull();
    expect(instanteEmFortaleza("amanha")).toBeNull();
  });

  it("limita a inatividade a um intervalo seguro", () => {
    expect(minutosInatividade("30")).toBe(30);
    expect(minutosInatividade("1")).toBe(30);
    expect(minutosInatividade("abc")).toBe(30);
    expect(minutosInatividade("90")).toBe(90);
  });
});

describe("tipo de alerta", () => {
  it("classifica vencido, 7 dias, 15 dias e folga", () => {
    expect(tipoAlertaAplicavel(-1)).toBe("vencido");
    expect(tipoAlertaAplicavel(0)).toBe("d7");
    expect(tipoAlertaAplicavel(7)).toBe("d7");
    expect(tipoAlertaAplicavel(8)).toBe("d15");
    expect(tipoAlertaAplicavel(15)).toBe("d15");
    expect(tipoAlertaAplicavel(16)).toBeNull();
    expect(faixaDoPrazo(16)).toBe("folga");
  });

  it("não reenvia o que já foi enviado e reenvia erro ou pendência", () => {
    const planos = [
      plano({ id: "p1", prazo: "2026-11-20" }),
      plano({ id: "p2", prazo: "2026-11-09" }),
      plano({ id: "p3", prazo: "2026-11-01" }),
      plano({ id: "p4", prazo: "2026-12-20", status: "concluido" }),
      plano({ id: "p5", prazo: "2026-11-01", status: "cancelado" }),
    ];
    const enviados: AlertaRegistrado[] = [
      { plano_acao_id: "p2", tipo: "d7", situacao: "enviado" },
      { plano_acao_id: "p3", tipo: "vencido", situacao: "erro" },
    ];
    const selecionados = selecionarAlertas(planos, agora, enviados);
    expect(selecionados.map((item) => [item.plano.id, item.tipo, item.reenvio])).toEqual([
      ["p1", "d15", false],
      ["p3", "vencido", true],
    ]);
  });

  it("escalona e reinicia o ciclo quando o prazo muda", () => {
    expect(escalonamentoDoAlerta("d15")).toBe("responsavel");
    expect(escalonamentoDoAlerta("d7")).toBe("risco");
    expect(escalonamentoDoAlerta("vencido")).toBe("admin");
    expect(chaveAlerta("p1", "d7")).toBe("p1:d7");
    expect(prazoAlteradoExigeNovoCiclo("2026-11-20", "2026-11-21")).toBe(true);
    expect(prazoAlteradoExigeNovoCiclo("2026-11-20T00:00:00", "2026-11-20")).toBe(false);
  });
});

describe("destinatários e segredo", () => {
  it("deduplica e mantém o responsável em primeiro", () => {
    expect(
      normalizarEmails([" Mesa@Cicobi.coop.br ", "tony@cicobi.coop.br", "tony@cicobi.coop.br", "invalido", null]),
    ).toEqual(["mesa@cicobi.coop.br", "tony@cicobi.coop.br"]);
    expect(distribuirDestinatarios(["mesa@cicobi.coop.br", "tony@cicobi.coop.br"])).toEqual({
      para: "mesa@cicobi.coop.br",
      copiaOculta: ["tony@cicobi.coop.br"],
    });
  });

  it("recusa segredo ausente, curto ou diferente", () => {
    expect(segredoConfere("Bearer segredo-longo-ok", "segredo-longo-ok")).toBe(true);
    expect(segredoConfere("bearer segredo-longo-ok", "segredo-longo-ok")).toBe(true);
    expect(segredoConfere("Bearer outro-segredo-ok", "segredo-longo-ok")).toBe(false);
    expect(segredoConfere("Bearer curto", "curto")).toBe(false);
    expect(segredoConfere(null, "segredo-longo-ok")).toBe(false);
  });
});

describe("mensagem", () => {
  it("escapa HTML e não leva nota sigilosa", () => {
    const mensagem = redigirAlerta({
      tipo: "d7",
      dias: 4,
      prazo: "2026-11-09",
      auditoriaCodigo: "AUD<script>",
      auditoriaTitulo: "Crédito & Garantia",
      constatacaoCodigo: "C-01",
      descricaoPlano: "Nota sigilosa não entra. " + "x".repeat(400),
      link: "https://auditoria.exemplo/auditorias/11111111-1111-4111-8111-111111111111",
    });
    expect(mensagem.html).toContain("AUD&lt;script&gt;");
    expect(mensagem.html).toContain("Crédito &amp; Garantia");
    expect(mensagem.html).not.toContain("<script>");
    expect(mensagem.texto).not.toContain("condição encontrada");
    expect(resumir("a".repeat(300)).endsWith("…")).toBe(true);
    expect(escaparHtml(`"'<>&`)).toBe("&quot;&#39;&lt;&gt;&amp;");
  });
});

describe("processamento idempotente", () => {
  it("envia uma vez, reenvia erro e não duplica corrida", async () => {
    const registros = new Map<string, { situacao: string; destinatarios: string[] }>();
    const enviados: string[] = [];
    const escalonados: string[] = [];
    const planos = [
      plano({ id: "p1", prazo: "2026-11-20" }),
      plano({ id: "p2", prazo: "2026-11-09" }),
      plano({ id: "p3", prazo: "2026-11-01", responsavelEmail: null }),
    ];
    const existentes: AlertaRegistrado[] = [{ plano_acao_id: "p2", tipo: "d7", situacao: "enviado" }];

    const depsBase = {
      agora,
      urlBase: "https://auditoria.exemplo",
      listarPlanos: async () => planos,
      listarAlertas: async () => existentes,
      listarDestinatarios: async (item: PlanoParaAlerta) => [item.responsavelEmail, "tony@cicobi.coop.br"],
      reservar: async (id: string, tipo: string): Promise<ReservaAlerta> => {
        const chave = `${id}:${tipo}`;
        const atual = registros.get(chave);
        if (!atual) {
          registros.set(chave, { situacao: "pendente", destinatarios: [] });
          return "nova";
        }
        if (atual.situacao === "enviado") return "ignorar";
        return "reenviar";
      },
      marcarEnviado: async (id: string, tipo: string, destinatarios: string[]) => {
        registros.set(`${id}:${tipo}`, { situacao: "enviado", destinatarios });
      },
      marcarErro: async (id: string, tipo: string) => {
        registros.set(`${id}:${tipo}`, { situacao: "erro", destinatarios: [] });
      },
      atualizarEscalonamento: async (id: string, nivel: string) => {
        escalonados.push(`${id}:${nivel}`);
      },
    };

    const primeiro = await processarAlertas({
      ...depsBase,
      enviar: async (entrada) => {
        enviados.push(entrada.assunto);
        if (entrada.destinatarios.includes("mesa@cicobi.coop.br") && entrada.assunto.includes("15 dias")) {
          return { ok: false, erro: "Resend indisponível" };
        }
        return { ok: true, id: "msg-1" };
      },
    });

    expect(primeiro.enviados).toBe(1);
    expect(primeiro.erros).toBe(1);
    expect(enviados).toHaveLength(2);
    expect(registros.get("p1:d15")?.situacao).toBe("erro");
    expect(registros.get("p3:vencido")?.situacao).toBe("enviado");
    expect(escalonados).toEqual(["p3:admin"]);

    existentes.push({ plano_acao_id: "p3", tipo: "vencido", situacao: "enviado" });
    const segundo = await processarAlertas({
      ...depsBase,
      enviar: async (entrada) => {
        enviados.push(entrada.assunto);
        return { ok: true, id: "msg-2" };
      },
    });
    expect(segundo.enviados).toBe(1);
    expect(enviados.filter((assunto) => assunto.includes("vencido"))).toHaveLength(1);
    expect(registros.get("p1:d15")?.situacao).toBe("enviado");
  });
});
