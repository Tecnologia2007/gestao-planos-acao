import { notFound } from "next/navigation";
import { z } from "zod";
import {
  FormularioAuditoria,
  FormularioConstatacao,
  FormularioEvidencia,
  FormularioPlano,
  FormularioRecomendacao,
  FormularioValidacao,
} from "@/componentes/formularios";
import { Selo, tomNivel } from "@/componentes/selo";
import { faixaDoPrazo } from "@/dominio/alertas";
import { planoEncerrado } from "@/dominio/atendimento";
import { abrirCampoSigiloso } from "@/dominio/cripto";
import { mensagemConsulta } from "@/dominio/erros";
import {
  ROTULO_ATENDIMENTO,
  ROTULO_CLASSIFICACAO,
  ROTULO_ESCALONAMENTO,
  ROTULO_NIVEL,
  ROTULO_PRIORIDADE,
  ROTULO_STATUS_AUDITORIA,
  ROTULO_STATUS_CONSTATACAO,
  ROTULO_STATUS_PLANO,
  ROTULO_TIPO_AUDITORIA,
  ROTULO_VALIDACAO,
  rotulo,
} from "@/dominio/rotulos";
import { diasAtePrazo, formatarData, formatarDataHora } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { Auditoria, Constatacao, Evidencia, Perfil, Plano, Recomendacao, Validacao } from "@/tipos";

export const metadata = { title: "Auditoria" };

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export default async function DetalheAuditoria({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const { supabase, podeEscrever } = await exigirContexto();
  const { data, error } = await supabase.from("auditorias").select("*").eq("id", id).maybeSingle();
  if (error) return <p className="aviso">{mensagemConsulta(error.message)}</p>;
  if (!data) notFound();
  const auditoria = data as Auditoria;

  const { data: constatacoesBrutas } = await supabase
    .from("constatacoes")
    .select(`
      *,
      recomendacoes (
        *,
        planos_acao (
          *,
          responsavel:profiles!planos_acao_responsavel_id_fkey (id, nome, email),
          evidencias (*),
          validacoes (*, validador:profiles!validacoes_validado_por_fkey (id, nome))
        )
      )
    `)
    .eq("auditoria_id", id)
    .order("codigo");

  const { data: pessoas } = podeEscrever
    ? await supabase.from("profiles").select("id, nome, email").in("papel", ["admin", "risco"]).eq("status_acesso", "aprovado")
    : { data: [] };

  const notas = abrirCampoSigiloso(auditoria.notas_sigilosas, process.env.ENCRYPTION_KEY);
  const constatacoes = (constatacoesBrutas ?? []) as Constatacao[];
  const agora = new Date();

  return (
    <>
      <p className="olho-escuro">{auditoria.codigo}</p>
      <h1>{auditoria.titulo}</h1>
      <div className="meta">
        <Selo>{rotulo(ROTULO_TIPO_AUDITORIA, auditoria.tipo)}</Selo>
        <Selo>{rotulo(ROTULO_STATUS_AUDITORIA, auditoria.status)}</Selo>
        <Selo tom={tomNivel(auditoria.nivel_risco)}>{rotulo(ROTULO_NIVEL, auditoria.nivel_risco)}</Selo>
        <span>{auditoria.unidade || "Unidade não informada"}</span>
        <span>{formatarData(auditoria.periodo_inicio)} – {formatarData(auditoria.periodo_fim)}</span>
      </div>
      <section className="duas" style={{ marginTop: 18 }}>
        <article className="painel">
          <h2>Enquadramento</h2>
          <p><strong>Objetivo. </strong>{auditoria.objetivo || "—"}</p>
          <p><strong>Escopo. </strong>{auditoria.escopo || "—"}</p>
          <p><strong>Critério. </strong>{auditoria.criterio || "—"}</p>
        </article>
        <article className="painel">
          <h2>Notas sigilosas</h2>
          {notas.aviso ? <p className="aviso">{notas.aviso}</p> : <p>{notas.texto || "Nenhuma nota sigilosa."}</p>}
        </article>
      </section>

      {podeEscrever ? (
        <details className="painel" style={{ marginTop: 14 }}>
          <summary>Editar auditoria</summary>
          <FormularioAuditoria auditoria={auditoria} notas={notas.texto ?? ""} preservarNotas={Boolean(notas.aviso)} />
        </details>
      ) : null}

      <section className="arvore">
        <div className="linha">
          <h2>Constatações</h2>
        </div>
        {constatacoes.length === 0 ? <p>Nenhuma constatação registrada.</p> : null}
        {constatacoes.map((constatacao) => {
          const notaConst = abrirCampoSigiloso(constatacao.notas_sigilosas, process.env.ENCRYPTION_KEY);
          const recomendacoes = (constatacao.recomendacoes ?? []) as Recomendacao[];
          return (
            <article key={constatacao.id} className="constatacao">
              <div className="linha">
                <h3>{constatacao.codigo} · {constatacao.titulo}</h3>
                <div>
                  <Selo tom={tomNivel(constatacao.classificacao)}>{rotulo(ROTULO_CLASSIFICACAO, constatacao.classificacao)}</Selo>
                  <Selo>{rotulo(ROTULO_STATUS_CONSTATACAO, constatacao.status)}</Selo>
                </div>
              </div>
              <div className="quatro">
                <div><strong>Critério</strong>{constatacao.criterio || "—"}</div>
                <div><strong>Condição</strong>{constatacao.condicao || "—"}</div>
                <div><strong>Causa</strong>{constatacao.causa || "—"}</div>
                <div><strong>Efeito</strong>{constatacao.efeito || "—"}</div>
              </div>
              {notaConst.aviso ? <p className="aviso">{notaConst.aviso}</p> : notaConst.texto ? <p className="sigilo">Nota sigilosa: {notaConst.texto}</p> : null}

              {recomendacoes.map((recomendacao) => {
                const planos = (recomendacao.planos_acao ?? []) as Plano[];
                return (
                  <section key={recomendacao.id} className="caixa">
                    <h3>Recomendação</h3>
                    <p>{recomendacao.descricao}</p>
                    <Selo>{rotulo(ROTULO_PRIORIDADE, recomendacao.prioridade)}</Selo>
                    <span className="sigilo">Prazo sugerido: {formatarData(recomendacao.prazo_sugerido)}</span>
                    {planos.map((plano) => {
                      const dias = diasAtePrazo(plano.prazo, agora);
                      const faixa = planoEncerrado(plano.status) ? "folga" : faixaDoPrazo(dias);
                      const responsavel = um(plano.responsavel);
                      const evidencias = (plano.evidencias ?? []) as Evidencia[];
                      const validacoes = (plano.validacoes ?? []) as Validacao[];
                      return (
                        <article key={plano.id} className={`plano ${faixa === "folga" ? "" : faixa}`}>
                          <h3>Plano de ação</h3>
                          <p>{plano.descricao}</p>
                          <div className="meta">
                            <span>Responsável: {responsavel?.nome || responsavel?.email || "A definir"}</span>
                            <span>Prazo: {formatarData(plano.prazo)}{dias < 0 && !planoEncerrado(plano.status) ? " · vencido" : ""}</span>
                            <Selo>{rotulo(ROTULO_STATUS_PLANO, plano.status)}</Selo>
                            <Selo tom={plano.atendimento === "nao_atende" ? "vencido" : plano.atendimento === "atende_integralmente" ? "ok" : "neutro"}>
                              {rotulo(ROTULO_ATENDIMENTO, plano.atendimento)}
                            </Selo>
                            <Selo>{rotulo(ROTULO_ESCALONAMENTO, plano.escalonamento)}</Selo>
                          </div>
                          {plano.justificativa_atendimento ? <p><strong>Justificativa. </strong>{plano.justificativa_atendimento}</p> : null}
                          <h3>Evidências</h3>
                          {evidencias.length === 0 ? <p>Nenhuma evidência.</p> : (
                            <ul className="lista-simples">
                              {evidencias.map((evidencia) => (
                                <li key={evidencia.id}>
                                  {evidencia.descricao}
                                  {evidencia.referencia ? ` · ${evidencia.referencia}` : ""}
                                  <span className="sigilo"> · {formatarDataHora(evidencia.criado_em)}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <h3>Validações</h3>
                          {validacoes.length === 0 ? <p>Ainda sem validação.</p> : (
                            <ul className="lista-simples">
                              {validacoes.map((validacao) => {
                                const validador = um(validacao.validador);
                                return (
                                  <li key={validacao.id}>
                                    {rotulo(ROTULO_VALIDACAO, validacao.resultado)}
                                    {validador?.nome ? ` · ${validador.nome}` : ""}
                                    {validacao.comentario ? ` — ${validacao.comentario}` : ""}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {podeEscrever ? (
                            <>
                              <details>
                                <summary>Atualizar plano</summary>
                                <FormularioPlano
                                  auditoriaId={auditoria.id}
                                  recomendacaoId={recomendacao.id}
                                  responsaveis={(pessoas ?? []) as Pick<Perfil, "id" | "nome" | "email">[]}
                                  plano={plano}
                                />
                              </details>
                              <details>
                                <summary>Registrar evidência</summary>
                                <FormularioEvidencia auditoriaId={auditoria.id} planoId={plano.id} />
                              </details>
                              <details>
                                <summary>Validar</summary>
                                <FormularioValidacao auditoriaId={auditoria.id} planoId={plano.id} />
                              </details>
                            </>
                          ) : null}
                        </article>
                      );
                    })}
                    {podeEscrever ? (
                      <details>
                        <summary>Novo plano de ação</summary>
                        <FormularioPlano
                          auditoriaId={auditoria.id}
                          recomendacaoId={recomendacao.id}
                          responsaveis={(pessoas ?? []) as Pick<Perfil, "id" | "nome" | "email">[]}
                        />
                      </details>
                    ) : null}
                  </section>
                );
              })}
              {podeEscrever ? (
                <>
                  <details>
                    <summary>Nova recomendação</summary>
                    <FormularioRecomendacao auditoriaId={auditoria.id} constatacaoId={constatacao.id} />
                  </details>
                  <details>
                    <summary>Editar constatação</summary>
                    <FormularioConstatacao
                      auditoriaId={auditoria.id}
                      constatacao={constatacao}
                      notas={notaConst.texto ?? ""}
                      preservarNotas={Boolean(notaConst.aviso)}
                    />
                  </details>
                </>
              ) : null}
            </article>
          );
        })}
      </section>
      {podeEscrever ? (
        <details className="painel">
          <summary>Nova constatação</summary>
          <FormularioConstatacao auditoriaId={auditoria.id} />
        </details>
      ) : null}
    </>
  );
}
