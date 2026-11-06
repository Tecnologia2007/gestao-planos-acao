import { sair } from "@/servidor/acoes/sessao";

export const metadata = { title: "Acesso" };

export default async function Acesso({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const semPerfil = params.motivo === "perfil";
  return (
    <div className="auth">
      <section className="hero">
        <div>
          <p className="olho">Cicobi Central Nordeste</p>
          <h1>{semPerfil ? "Perfil não encontrado" : "Acesso ainda não liberado"}</h1>
        </div>
        <p>
          {semPerfil
            ? "Sua conta existe, mas o perfil não foi criado. Aplique as migrations e peça ao administrador para concluir o cadastro."
            : "Auditor externo só entra depois da aprovação do administrador. O acesso também pode ter sido revogado ou ter expirado."}
        </p>
      </section>
      <section className="painel-auth">
        <form action={sair}>
          <button className="botao" type="submit">Sair</button>
        </form>
      </section>
    </div>
  );
}
