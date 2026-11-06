import Link from "next/link";
import { faixaDoPrazo } from "@/dominio/alertas";
import { planoEncerrado } from "@/dominio/atendimento";
import { mensagemConsulta } from "@/dominio/erros";
import { mapearPlanoCron, type LinhaPlanoCron } from "@/dominio/mapear-plano";
import { diasAtePrazo, formatarData } from "@/dominio/tempo";
import { ROTULO_NIVEL, ROTULO_STATUS_AUDITORIA, rotulo } from "@/dominio/rotulos";
import { exigirContexto } from "@/servidor/sessao";
import type { Auditoria } from "@/tipos";
import { Selo, tomFaixa, tomNivel } from "@/componentes/selo";

export const metadata = { title: "Painel" };

export default async function Painel() {
  const { supabase } = await exigirContexto();
  const agora = new Date();
  const [auditoriasResp, planosResp, abertasResp] = await Promise.all([
    supabase.from("auditorias").select("*").order("atualizado_em", { ascending: false }).limit(8),
    supabase.from("planos_acao").select(`
      id, descricao, prazo, status, atendimento,
      responsavel:profiles!planos_acao_responsavel_id_fkey(email),
      recomendacoes (
        descricao,
        constatacoes (
          codigo,
          auditorias (id, codigo, titulo)
        )
)
  `),
    supabase
      .from("auditorias")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("encerrada","cancelada")'),
  ]);

  const aviso = mensagemConsulta(auditoriasResp.error?.message ?? planosResp.error?.message);
  const auditorias = (auditoriasResp.data ?? []) as Auditoria[];
  const planos = (planosResp.data ?? [])
    .map((linha) => mapearPlanoCron(linha as LinhaPlanoCron))
    .filter((plano): plano is NonNullable<typeof plano> => plano !== null)
    .map((plano) => ({ ...plano, dias: diasAtePrazo(plano.prazo, agora) }))
    .filter((plano) => !planoEncerrado(plano.status as "concluido"));

  const abertas = abertasResp.count ?? auditorias.filter((item) => !["encerrada", "cancelada"].includes(item.status)).length;
  const vencidos = planos.filter((plano) => plano.dias < 0).length;
  const em7 = planos.filter((plano) => plano.dias >= 0 && plano.dias <= 7).length;
  const em15 = planos.filter((plano) => plano.dias > 7 && plano.dias <= 15).length;
  const atencao = planos
    .filter((plano) => plano.dias <= 15)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 8);

  return (
    <>
      <div className="linha">
        <div>
          <p className="olho-escuro">Cicobi Central Nordeste</p>
          <h1>Central de Auditorias</h1>
          <p className="sub">Constatações, recomendações e planos de ação no mesmo fio, com prazo, evidência e validação.</p>
        </div>
      </div>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <section className="grade">
        <article className="cartao"><span>Auditorias em aberto</span><p className="numero">{abertas}</p></article>
        <article className="cartao vencido"><span>Planos vencidos</span><p className="numero">{vencidos}</p></article>
        <article className="cartao perto"><span>Até 7 dias</span><p className="numero">{em7}</p></article>
        <article className="cartao"><span>De 8 a 15 dias</span><p className="numero">{em15}</p></article>
      </section>
      <section className="duas">
        <article className="painel">
          <h2>Prazos que pedem atenção</h2>
          {atencao.length === 0 ? <p>Nenhum plano vencido ou a vencer em 15 dias.</p> : (
            <table className="tabela">
              <thead>
                <tr><th>Auditoria</th><th>Plano</th><th>Prazo</th></tr>
              </thead>
              <tbody>
                {atencao.map((plano) => {
                  const faixa = faixaDoPrazo(plano.dias);
                  return (
                    <tr key={plano.id} className={faixa}>
                      <td><Link href={`/auditorias/${plano.auditoriaId}`}>{plano.auditoriaCodigo}</Link></td>
                      <td>{plano.descricao}</td>
                      <td>
                        <Selo tom={tomFaixa(faixa)}>{formatarData(plano.prazo)}</Selo>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </article>
        <article className="painel">
          <h2>Auditorias recentes</h2>
          <ul className="lista-simples">
            {auditorias.map((auditoria) => (
              <li key={auditoria.id}>
                <Link href={`/auditorias/${auditoria.id}`}>{auditoria.codigo}</Link>
                <div>{auditoria.titulo}</div>
                <Selo tom={tomNivel(auditoria.nivel_risco)}>{rotulo(ROTULO_NIVEL, auditoria.nivel_risco)}</Selo>
                <Selo>{rotulo(ROTULO_STATUS_AUDITORIA, auditoria.status)}</Selo>
              </li>
            ))}
          </ul>
          {auditorias.length === 0 ? <p>Nenhuma auditoria visível para o seu acesso.</p> : null}
        </article>
      </section>
    </>
  );
}
