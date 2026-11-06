import { mensagemConsulta } from "@/dominio/erros";
import { chavesAlteradas, mascararRegistro } from "@/dominio/trilha";
import { formatarDataHora } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { Perfil, TrilhaLinha } from "@/tipos";

export const metadata = { title: "Trilha" };

const OPERACAO: Record<string, string> = { INSERT: "Inclusão", UPDATE: "Alteração", DELETE: "Exclusão" };

export default async function PaginaTrilha() {
  const { supabase } = await exigirContexto({ papeis: ["admin", "risco"] });
  const [trilhaResp, pessoasResp] = await Promise.all([
    supabase.from("trilha_auditoria").select("*").order("criado_em", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, nome, email"),
  ]);
  const aviso = mensagemConsulta(trilhaResp.error?.message);
  const linhas = (trilhaResp.data ?? []) as TrilhaLinha[];
  const pessoas = new Map((pessoasResp.data as Pick<Perfil, "id" | "nome" | "email">[] | null)?.map((pessoa) => [pessoa.id, pessoa.nome || pessoa.email]) ?? []);

  return (
    <>
      <h1>Trilha de auditoria</h1>
      <p className="sub">Cada inclusão, alteração e exclusão fica registrada. Campos sigilosos aparecem apenas como cifrados.</p>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <div className="painel">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Quem</th><th>O quê</th><th>Campos</th></tr></thead>
          <tbody>
            {linhas.map((linha) => {
              const antes = mascararRegistro(linha.dados_anteriores);
              const depois = mascararRegistro(linha.dados_novos);
              const campos = chavesAlteradas(antes, depois).slice(0, 8).join(", ");
              return (
                <tr key={linha.id}>
                  <td>{formatarDataHora(linha.criado_em)}</td>
                  <td>{linha.usuario_id ? pessoas.get(linha.usuario_id) ?? "Usuário" : "Sistema"}</td>
                  <td>{OPERACAO[linha.operacao] ?? linha.operacao} em {linha.tabela}</td>
                  <td>{campos || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {linhas.length === 0 ? <p>Nenhum evento na trilha.</p> : null}
      </div>
    </>
  );
}
