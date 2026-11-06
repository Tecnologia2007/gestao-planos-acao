import Link from "next/link";
import { mensagemConsulta } from "@/dominio/erros";
import { ROTULO_NIVEL, ROTULO_STATUS_AUDITORIA, ROTULO_TIPO_AUDITORIA, rotulo } from "@/dominio/rotulos";
import { formatarData } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { Auditoria } from "@/tipos";
import { Selo, tomNivel } from "@/componentes/selo";

export const metadata = { title: "Auditorias" };

function limpar(valor: string | undefined) {
  return (valor ?? "").replace(/[%_,.()"'\\]/g, "").trim().slice(0, 80);
}

export default async function PaginaAuditorias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const filtros = await searchParams;
  const { supabase, podeEscrever } = await exigirContexto();
  let consulta = supabase.from("auditorias").select("*").order("criado_em", { ascending: false });
  if (filtros.status) consulta = consulta.eq("status", filtros.status);
  if (filtros.tipo) consulta = consulta.eq("tipo", filtros.tipo);
  if (filtros.nivel) consulta = consulta.eq("nivel_risco", filtros.nivel);
  const termo = limpar(filtros.q);
  if (termo) consulta = consulta.or(`titulo.ilike.%${termo}%,codigo.ilike.%${termo}%,unidade.ilike.%${termo}%`);
  const { data, error } = await consulta;
  const aviso = mensagemConsulta(error?.message);
  const auditorias = (data ?? []) as Auditoria[];

  return (
    <>
      <div className="linha">
        <div>
          <h1>Auditorias</h1>
          <p className="sub">A lista respeita o seu papel. Auditor externo vê só as auditorias atribuídas, aprovadas e dentro da validade.</p>
        </div>
        {podeEscrever ? <Link className="botao" href="/auditorias/nova">Nova auditoria</Link> : null}
      </div>
      <form className="filtros" method="get">
        <input name="q" placeholder="Código, título ou unidade" defaultValue={filtros.q ?? ""} aria-label="Busca" />
        <select name="status" defaultValue={filtros.status ?? ""} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(ROTULO_STATUS_AUDITORIA).map(([valor, rotuloStatus]) => (
            <option key={valor} value={valor}>{rotuloStatus}</option>
          ))}
        </select>
        <select name="tipo" defaultValue={filtros.tipo ?? ""} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {Object.entries(ROTULO_TIPO_AUDITORIA).map(([valor, rotuloTipo]) => (
            <option key={valor} value={valor}>{rotuloTipo}</option>
          ))}
        </select>
        <select name="nivel" defaultValue={filtros.nivel ?? ""} aria-label="Risco">
          <option value="">Todos os riscos</option>
          {Object.entries(ROTULO_NIVEL).map(([valor, rotuloNivel]) => (
            <option key={valor} value={valor}>{rotuloNivel}</option>
          ))}
        </select>
        <button className="botao" type="submit">Filtrar</button>
      </form>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <div className="painel">
        <table className="tabela">
          <thead>
            <tr><th>Código</th><th>Título</th><th>Unidade</th><th>Período</th><th>Risco</th></tr>
          </thead>
          <tbody>
            {auditorias.map((auditoria) => (
              <tr key={auditoria.id}>
                <td><Link href={`/auditorias/${auditoria.id}`}>{auditoria.codigo}</Link></td>
                <td>
                  {auditoria.titulo}
                  <div>
                    <Selo>{rotulo(ROTULO_TIPO_AUDITORIA, auditoria.tipo)}</Selo>
                    <Selo>{rotulo(ROTULO_STATUS_AUDITORIA, auditoria.status)}</Selo>
                  </div>
                </td>
                <td>{auditoria.unidade || "—"}</td>
                <td>{formatarData(auditoria.periodo_inicio)} – {formatarData(auditoria.periodo_fim)}</td>
                <td><Selo tom={tomNivel(auditoria.nivel_risco)}>{rotulo(ROTULO_NIVEL, auditoria.nivel_risco)}</Selo></td>
              </tr>
            ))}
          </tbody>
        </table>
        {auditorias.length === 0 ? <p>Nenhuma auditoria encontrada com esses filtros.</p> : null}
      </div>
    </>
  );
}
