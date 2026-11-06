import Link from "next/link";
import { headers } from "next/headers";
import { diasAtePrazo, horaNoFuso, saudacao } from "@/dominio/tempo";
import { ROTULO_PAPEL } from "@/dominio/rotulos";
import { registrarAcesso } from "@/servidor/acesso-log";
import { sair } from "@/servidor/acoes/sessao";
import { exigirContexto } from "@/servidor/sessao";
import { Selo } from "@/componentes/selo";

const LINKS = [
  { href: "/", rotulo: "Painel" },
  { href: "/auditorias", rotulo: "Auditorias" },
  { href: "/planos", rotulo: "Planos de ação" },
  { href: "/alertas", rotulo: "Alertas" },
];

export async function Moldura({ children }: { children: React.ReactNode }) {
  const { supabase, perfil, podeEscrever, podeAdministrar } = await exigirContexto();
  const caminho = (await headers()).get("x-caminho") ?? "/";
  await registrarAcesso("consulta", caminho);

  const { data: planos } = await supabase.from("planos_acao").select("prazo, status");
  const agora = new Date();
  const atencao = (planos ?? []).filter((plano) => {
    if (plano.status === "concluido" || plano.status === "cancelado") return false;
    return diasAtePrazo(plano.prazo as string, agora) <= 15;
  }).length;

  return (
    <div className="shell">
      <aside className="barra">
        <div className="marca">
          <div className="monograma" aria-hidden>
            C
          </div>
          <div>
            <small>Cicobi</small>
            <strong>Central Nordeste</strong>
          </div>
        </div>
        <nav className="nav" aria-label="Principal">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={caminho === link.href ? "page" : undefined}>
              {link.rotulo}
              {link.href === "/alertas" && atencao > 0 ? ` (${atencao})` : ""}
            </Link>
          ))}
          {podeEscrever ? <Link href="/auditorias/nova">Nova auditoria</Link> : null}
          {podeAdministrar ? <Link href="/usuarios">Usuários</Link> : null}
          {podeAdministrar ? <Link href="/acessos">Acessos</Link> : null}
          {perfil.papel !== "auditor" ? <Link href="/trilha">Trilha</Link> : null}
        </nav>
        <div className="barra-rodape">
          <form action={sair}>
            <button className="sair" type="submit">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <div className="miolo">
        <header className="topo">
          <p>
            {saudacao(horaNoFuso(agora))}, {perfil.nome || perfil.email}
          </p>
          <Selo tom={perfil.papel === "auditor" ? "neutro" : "ok"}>{ROTULO_PAPEL[perfil.papel]}</Selo>
        </header>
        <div className="conteudo">{children}</div>
      </div>
    </div>
  );
}
