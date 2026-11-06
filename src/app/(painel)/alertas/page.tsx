import Link from "next/link";
import { faixaDoPrazo, type TipoAlerta } from "@/dominio/alertas";
import { planoEncerrado } from "@/dominio/atendimento";
import { mensagemConsulta } from "@/dominio/erros";
import { mapearPlanoCron, type LinhaPlanoCron } from "@/dominio/mapear-plano";
import { ROTULO_ALERTA, rotulo } from "@/dominio/rotulos";
import { diasAtePrazo, formatarData, formatarDataHora } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { AlertaLinha } from "@/tipos";
import { Selo, tomFaixa } from "@/componentes/selo";

export const metadata = { title: "Alertas" };

export default async function PaginaAlertas() {
  const { supabase, perfil } = await exigirContexto();
  const agora = new Date();
  const { data, error } = await supabase.from("planos_acao").select(`
    id, descricao, prazo, status,
    responsavel:profiles!planos_acao_responsavel_id_fkey(email),
    recomendacoes (descricao, constatacoes (codigo, auditorias (id, codigo, titulo)))
  `);
  const planos = (data ?? [])
    .map((linha) => mapearPlanoCron(linha as LinhaPlanoCron))
    .filter((plano): plano is NonNullable<typeof plano> => plano !== null)
    .map((plano) => ({ ...plano, dias: diasAtePrazo(plano.prazo, agora) }))
    .filter((plano) => !planoEncerrado(plano.status as "concluido") && plano.dias <= 15)
    .sort((a, b) => a.dias - b.dias);

  let enviados: AlertaLinha[] = [];
  let avisoLog: string | null = null;
  if (perfil.papel !== "auditor") {
    const resposta = await supabase.from("alertas").select("*").order("atualizado_em", { ascending: false }).limit(50);
    avisoLog = mensagemConsulta(resposta.error?.message);
    enviados = (resposta.data ?? []) as AlertaLinha[];
  }

  return (
    <>
      <h1>Alertas de prazo</h1>
      <p className="sub">
        O agendamento diário, às 8h de Fortaleza, envia um aviso aos 15 dias, outro aos 7 dias e outro quando o plano vence.
        Cada combinação de plano e tipo sai uma única vez. Se o prazo mudar, o ciclo recomeça.
      </p>
      {mensagemConsulta(error?.message) ? <p className="aviso">{mensagemConsulta(error?.message)}</p> : null}
      <div className="painel">
        <h2>Na janela agora</h2>
        <table className="tabela">
          <thead><tr><th>Auditoria</th><th>Plano</th><th>Situação</th><th>Prazo</th></tr></thead>
          <tbody>
            {planos.map((plano) => {
              const faixa = faixaDoPrazo(plano.dias);
              return (
                <tr key={plano.id} className={faixa}>
                  <td><Link href={`/auditorias/${plano.auditoriaId}`}>{plano.auditoriaCodigo}</Link></td>
                  <td>{plano.descricao}</td>
                  <td><Selo tom={tomFaixa(faixa)}>{faixa === "vencido" ? "Vencido" : faixa === "d7" ? "Até 7 dias" : "Até 15 dias"}</Selo></td>
                  <td>{formatarData(plano.prazo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {planos.length === 0 ? <p>Nenhum plano nesta janela.</p> : null}
      </div>
      {perfil.papel !== "auditor" ? (
        <div className="painel" style={{ marginTop: 14 }}>
          <h2>Envios registrados</h2>
          {avisoLog ? <p className="aviso">{avisoLog}</p> : null}
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Tipo</th><th>Situação</th><th>Destinatários</th></tr></thead>
            <tbody>
              {enviados.map((alerta) => (
                <tr key={alerta.id}>
                  <td>{formatarDataHora(alerta.atualizado_em)}</td>
                  <td>{rotulo(ROTULO_ALERTA, alerta.tipo as TipoAlerta)}</td>
                  <td>{alerta.situacao}{alerta.ultimo_erro ? ` · ${alerta.ultimo_erro}` : ""}</td>
                  <td>{alerta.destinatarios.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {enviados.length === 0 ? <p>Nenhum e-mail registrado ainda.</p> : null}
        </div>
      ) : null}
    </>
  );
}
