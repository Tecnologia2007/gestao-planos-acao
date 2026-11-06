import Link from "next/link";
import { faixaDoPrazo } from "@/dominio/alertas";
import { mensagemConsulta } from "@/dominio/erros";
import { mapearPlanoCron, type LinhaPlanoCron } from "@/dominio/mapear-plano";
import { ROTULO_ATENDIMENTO, ROTULO_STATUS_PLANO, rotulo } from "@/dominio/rotulos";
import { diasAtePrazo, formatarData } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import { Selo, tomFaixa } from "@/componentes/selo";

export const metadata = { title: "Planos de ação" };

export default async function PaginaPlanos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtros = await searchParams;
  const { supabase } = await exigirContexto();
  const { data, error } = await supabase.from("planos_acao").select(`
    id, descricao, prazo, status, atendimento, escalonamento,
    responsavel:profiles!planos_acao_responsavel_id_fkey(nome, email),
    recomendacoes (
      descricao,
      constatacoes (
        codigo,
        auditorias (id, codigo, titulo)
      )
    )
  `);
  const aviso = mensagemConsulta(error?.message);
  const agora = new Date();
  const planos = (data ?? [])
    .map((linha) => {
      const base = mapearPlanoCron(linha as LinhaPlanoCron);
      if (!base) return null;
      const bruto = linha as {
        atendimento?: string;
        responsavel?: { nome?: string | null } | { nome?: string | null }[] | null;
      };
      const responsavel = Array.isArray(bruto.responsavel) ? bruto.responsavel[0] : bruto.responsavel;
      return {
        ...base,
        atendimento: bruto.atendimento ?? "pendente",
        responsavel: responsavel?.nome ?? base.responsavelEmail ?? "A definir",
        dias: diasAtePrazo(base.prazo, agora),
      };
    })
    .filter((plano): plano is NonNullable<typeof plano> => plano !== null)
    .filter((plano) => (filtros.status ? plano.status === filtros.status : true))
    .filter((plano) => (filtros.atendimento ? plano.atendimento === filtros.atendimento : true))
    .filter((plano) => {
      if (filtros.janela === "vencidos") return plano.dias < 0 && plano.status !== "concluido" && plano.status !== "cancelado";
      if (filtros.janela === "d7") return plano.dias >= 0 && plano.dias <= 7;
      if (filtros.janela === "d15") return plano.dias >= 0 && plano.dias <= 15;
      return true;
    })
    .sort((a, b) => a.dias - b.dias);

  return (
    <>
      <h1>Planos de ação</h1>
      <p className="sub">Cada plano diz quem faz, até quando, e se a resposta cobre o que a auditoria pediu.</p>
      <form className="filtros" method="get">
        <select name="status" defaultValue={filtros.status ?? ""} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(ROTULO_STATUS_PLANO).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select>
        <select name="atendimento" defaultValue={filtros.atendimento ?? ""} aria-label="Atendimento">
          <option value="">Qualquer atendimento</option>
          {Object.entries(ROTULO_ATENDIMENTO).map(([valor, nome]) => <option key={valor} value={valor}>{nome}</option>)}
        </select>
        <select name="janela" defaultValue={filtros.janela ?? ""} aria-label="Prazo">
          <option value="">Todos os prazos</option>
          <option value="vencidos">Vencidos</option>
          <option value="d7">Até 7 dias</option>
          <option value="d15">Até 15 dias</option>
        </select>
        <button className="botao" type="submit">Filtrar</button>
      </form>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <div className="painel">
        <table className="tabela">
          <thead>
            <tr><th>Auditoria</th><th>Plano</th><th>Responsável</th><th>Atendimento</th><th>Prazo</th></tr>
          </thead>
          <tbody>
            {planos.map((plano) => {
              const faixa = plano.status === "concluido" || plano.status === "cancelado" ? "folga" : faixaDoPrazo(plano.dias);
              return (
                <tr key={plano.id} className={faixa === "folga" ? "" : faixa}>
                  <td><Link href={`/auditorias/${plano.auditoriaId}`}>{plano.auditoriaCodigo}</Link><div>{plano.constatacaoCodigo}</div></td>
                  <td>{plano.descricao}<div><Selo>{rotulo(ROTULO_STATUS_PLANO, plano.status)}</Selo></div></td>
                  <td>{plano.responsavel}</td>
                  <td>{rotulo(ROTULO_ATENDIMENTO, plano.atendimento)}</td>
                  <td><Selo tom={tomFaixa(faixa)}>{formatarData(plano.prazo)}</Selo></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {planos.length === 0 ? <p>Nenhum plano encontrado.</p> : null}
      </div>
    </>
  );
}
