import { FormularioAcesso, FormularioAtribuicao, FormularioConvite, FormularioRevogar } from "@/componentes/formularios";
import { Selo } from "@/componentes/selo";
import { mensagemConsulta } from "@/dominio/erros";
import { ROTULO_ATRIBUICAO, ROTULO_PAPEL, ROTULO_STATUS_ACESSO, rotulo } from "@/dominio/rotulos";
import { formatarDataHora } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { Atribuicao, Auditoria, Perfil } from "@/tipos";

export const metadata = { title: "Usuários" };

function um<T>(valor: T | T[] | null | undefined): T | null {
  if (!valor) return null;
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

export default async function PaginaUsuarios() {
  const { supabase } = await exigirContexto({ papeis: ["admin"] });
  const [pessoasResp, auditoriasResp, atribuicoesResp] = await Promise.all([
    supabase.from("profiles").select("*").order("nome"),
    supabase.from("auditorias").select("id, codigo, titulo").order("codigo"),
    supabase.from("atribuicoes_auditor").select("*, auditoria:auditorias(codigo, titulo)").order("criado_em", { ascending: false }),
  ]);
  const aviso = mensagemConsulta(pessoasResp.error?.message ?? atribuicoesResp.error?.message);
  const pessoas = (pessoasResp.data ?? []) as Perfil[];
  const auditorias = (auditoriasResp.data ?? []) as Pick<Auditoria, "id" | "codigo" | "titulo">[];
  const atribuicoes = (atribuicoesResp.data ?? []) as Atribuicao[];
  const auditores = pessoas.filter((pessoa) => pessoa.papel === "auditor" && pessoa.status_acesso === "aprovado");

  return (
    <>
      <h1>Usuários e acessos</h1>
      <p className="sub">O auditor externo só consulta as auditorias atribuídas depois que você aprova o acesso. A aprovação pode expirar e pode ser revogada.</p>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <FormularioConvite />
      <div className="arvore" style={{ marginTop: 16 }}>
        {pessoas.map((pessoa) => (
          <article key={pessoa.id} className="painel">
            <div className="linha">
              <div>
                <h2>{pessoa.nome || pessoa.email}</h2>
                <p className="sub">{pessoa.email}</p>
              </div>
              <div>
                <Selo>{rotulo(ROTULO_PAPEL, pessoa.papel)}</Selo>
                <Selo tom={pessoa.status_acesso === "aprovado" ? "ok" : pessoa.status_acesso === "revogado" ? "vencido" : "d7"}>
                  {rotulo(ROTULO_STATUS_ACESSO, pessoa.status_acesso)}
                </Selo>
              </div>
            </div>
            {pessoa.acesso_expira_em ? <p>Expira em {formatarDataHora(pessoa.acesso_expira_em)}</p> : null}
            <FormularioAcesso perfil={pessoa} />
          </article>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <FormularioAtribuicao auditores={auditores} auditorias={auditorias} />
      </div>
      <div className="painel" style={{ marginTop: 16 }}>
        <h2>Atribuições</h2>
        {atribuicoes.length === 0 ? <p>Nenhuma atribuição.</p> : null}
        {atribuicoes.map((item) => {
          const auditoria = um(item.auditoria);
          const auditor = pessoas.find((pessoa) => pessoa.id === item.auditor_id);
          return (
            <article key={item.id} className="caixa">
              <strong>{auditor?.nome || auditor?.email}</strong>
              <p>{auditoria ? `${auditoria.codigo} — ${auditoria.titulo}` : item.auditoria_id}</p>
              <Selo>{rotulo(ROTULO_ATRIBUICAO, item.status)}</Selo>
              {item.expira_em ? <span className="sigilo">Expira em {formatarDataHora(item.expira_em)}</span> : null}
              {item.status !== "revogada" ? <FormularioRevogar id={item.id} /> : <p>{item.motivo_revogacao}</p>}
            </article>
          );
        })}
      </div>
    </>
  );
}
