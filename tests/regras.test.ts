import { describe, expect, it } from "vitest";
import { acessoLiberado, atribuicaoVisivel, podeAdministrar, podeEscrever } from "@/dominio/acesso";
import {
  autoValidacao,
  comentarioValidacaoValido,
  justificativaValida,
  podeValidar,
  statusAoAnexarEvidencia,
  statusAposValidacao,
} from "@/dominio/atendimento";
import { cifrarTexto, decifrarTexto, pareceCifrado, prepararCampoSigiloso } from "@/dominio/cripto";
import { mensagemConsulta, traduzirErroAuth, traduzirErroBanco } from "@/dominio/erros";
import { mapearPlanoCron } from "@/dominio/mapear-plano";
import { chavesAlteradas, mascararRegistro } from "@/dominio/trilha";

const agora = new Date("2026-11-06T12:00:00Z");

describe("acesso", () => {
  it("libera só acesso aprovado e não vencido", () => {
    expect(acessoLiberado({ papel: "auditor", status_acesso: "aprovado", acesso_expira_em: null }, agora)).toBe(true);
    expect(acessoLiberado({ papel: "auditor", status_acesso: "pendente", acesso_expira_em: null }, agora)).toBe(false);
    expect(acessoLiberado({ papel: "auditor", status_acesso: "revogado", acesso_expira_em: null }, agora)).toBe(false);
    expect(
      acessoLiberado({ papel: "auditor", status_acesso: "aprovado", acesso_expira_em: "2026-11-01T00:00:00Z" }, agora),
    ).toBe(false);
    expect(
      acessoLiberado({ papel: "auditor", status_acesso: "aprovado", acesso_expira_em: "2026-12-01T00:00:00Z" }, agora),
    ).toBe(true);
  });

  it("separa escrita, administração e atribuição visível", () => {
    expect(podeEscrever({ papel: "risco" })).toBe(true);
    expect(podeEscrever({ papel: "auditor" })).toBe(false);
    expect(podeAdministrar({ papel: "admin" })).toBe(true);
    expect(atribuicaoVisivel({ status: "aprovada", revogado_em: null, expira_em: null }, agora)).toBe(true);
    expect(atribuicaoVisivel({ status: "aprovada", revogado_em: "2026-11-02", expira_em: null }, agora)).toBe(false);
    expect(atribuicaoVisivel({ status: "revogada", revogado_em: null, expira_em: null }, agora)).toBe(false);
  });
});

describe("atendimento do plano", () => {
  it("exige justificativa fora do atendimento integral", () => {
    expect(justificativaValida("pendente", "")).toBe(true);
    expect(justificativaValida("atende_integralmente", "")).toBe(true);
    expect(justificativaValida("atende_parcialmente", "curta")).toBe(false);
    expect(justificativaValida("nao_atende", "A carteira antiga segue em regularização.")).toBe(true);
    expect(comentarioValidacaoValido("aceita", "")).toBe(true);
    expect(comentarioValidacaoValido("rejeitada", "curto")).toBe(false);
  });

  it("pede evidência para aceitar e impede autoavaliação", () => {
    expect(podeValidar("aceita", 0)).toBe(false);
    expect(podeValidar("aceita_com_ressalvas", 1)).toBe(true);
    expect(podeValidar("rejeitada", 0)).toBe(true);
    expect(autoValidacao("pessoa-1", "pessoa-1")).toBe(true);
    expect(autoValidacao(null, "pessoa-1")).toBe(false);
    expect(statusAposValidacao("rejeitada")).toBe("em_andamento");
    expect(statusAposValidacao("aceita")).toBe("concluido");
    expect(statusAoAnexarEvidencia("em_andamento")).toBe("aguardando_validacao");
    expect(statusAoAnexarEvidencia("concluido")).toBe("concluido");
  });
});

describe("criptografia de campo", () => {
  it("cifra e decifra com AES-256-GCM", () => {
    const chave = "chave-de-teste-com-32-caracteres";
    const cifrado = cifrarTexto("exposição sem garantia oponível", chave);
    expect(pareceCifrado(cifrado)).toBe(true);
    expect(cifrado).not.toContain("exposição");
    expect(decifrarTexto(cifrado, chave)).toBe("exposição sem garantia oponível");
    expect(() => decifrarTexto(cifrado, "outra-chave-bem-longa-mesmo")).toThrow();
    expect(prepararCampoSigiloso("  ", chave)).toBeNull();
    expect(prepararCampoSigiloso("nota", chave)?.startsWith("v1.")).toBe(true);
  });
});

describe("erros e trilha", () => {
  it("traduz falhas sem repetir SQL", () => {
    expect(traduzirErroAuth("Invalid login credentials")).toBe("E-mail ou senha incorretos.");
    expect(traduzirErroBanco("duplicate key", "23505")).toMatch(/identificador/);
    expect(traduzirErroBanco("new row violates row-level security policy")).toMatch(/permissão/);
    expect(mensagemConsulta('relation "auditorias" does not exist')).toMatch(/migrations/);
    expect(traduzirErroBanco("syntax error at or near")).toBe("Não foi possível salvar. Verifique os dados e tente de novo.");
  });

  it("mascara notas e lista campos alterados", () => {
    expect(mascararRegistro({ titulo: "A", notas_sigilosas: "v1.segredo" })).toEqual({
      titulo: "A",
      notas_sigilosas: "[cifrado]",
    });
    expect(chavesAlteradas({ status: "aberta", atualizado_em: "1" }, { status: "encerrada", atualizado_em: "2" })).toEqual([
      "status",
    ]);
  });
});

describe("mapeamento do cron", () => {
  it("aceita relação objeto ou lista", () => {
    const objeto = mapearPlanoCron({
      id: "p1",
      prazo: "2026-11-20",
      status: "em_andamento",
      descricao: "Implantar a trava de liberação.",
      responsavel: { email: "mesa@cicobi.coop.br" },
      recomendacoes: {
        descricao: "Travar",
        constatacoes: { codigo: "C-01", auditorias: { id: "a1", codigo: "AUD-1", titulo: "Crédito" } },
      },
    });
    const lista = mapearPlanoCron({
      id: "p1",
      prazo: "2026-11-20",
      status: "em_andamento",
      descricao: "Implantar a trava de liberação.",
      responsavel: [{ email: "mesa@cicobi.coop.br" }],
      recomendacoes: [
        {
          constatacoes: [{ codigo: "C-01", auditorias: [{ id: "a1", codigo: "AUD-1", titulo: "Crédito" }] }],
        },
      ],
    });
    expect(objeto?.auditoriaCodigo).toBe("AUD-1");
    expect(lista?.responsavelEmail).toBe("mesa@cicobi.coop.br");
    expect(mapearPlanoCron({ id: "p1" })).toBeNull();
  });
});
