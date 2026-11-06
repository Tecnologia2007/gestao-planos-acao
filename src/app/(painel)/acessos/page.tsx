import { mensagemConsulta } from "@/dominio/erros";
import { formatarDataHora } from "@/dominio/tempo";
import { exigirContexto } from "@/servidor/sessao";
import type { LogAcesso, Perfil } from "@/tipos";

export const metadata = { title: "Acessos" };

export default async function PaginaAcessos() {
  const { supabase } = await exigirContexto({ papeis: ["admin"] });
  const [logsResp, pessoasResp] = await Promise.all([
    supabase.from("logs_acesso").select("*").order("criado_em", { ascending: false }).limit(200),
    supabase.from("profiles").select("id, nome, email"),
  ]);
  const aviso = mensagemConsulta(logsResp.error?.message);
  const logs = (logsResp.data ?? []) as LogAcesso[];
  const pessoas = new Map((pessoasResp.data as Pick<Perfil, "id" | "nome" | "email">[] | null)?.map((pessoa) => [pessoa.id, pessoa.nome || pessoa.email]) ?? []);

  return (
    <>
      <h1>Log de acessos</h1>
      <p className="sub">Consultas autenticadas às páginas do sistema, com usuário, recurso e origem.</p>
      {aviso ? <p className="aviso">{aviso}</p> : null}
      <div className="painel">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Quem</th><th>Recurso</th><th>IP</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatarDataHora(log.criado_em)}</td>
                <td>{log.usuario_id ? pessoas.get(log.usuario_id) ?? "Usuário" : "—"}</td>
                <td>{log.acao} {log.recurso}</td>
                <td>{log.ip || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 ? <p>Nenhum acesso registrado.</p> : null}
      </div>
    </>
  );
}
