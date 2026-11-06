import { Entrar } from "@/componentes/entrar";

export const metadata = { title: "Entrar" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  return (
    <div className="auth">
      <section className="hero">
        <div>
          <p className="olho">Cicobi Central Nordeste</p>
          <h1>Central de Auditorias</h1>
        </div>
        <p>O acompanhamento das constatações fica com a área de riscos. O auditor externo consulta só o que lhe foi atribuído, depois da aprovação e do segundo fator.</p>
      </section>
      <section className="painel-auth">
        <div className="caixa-auth">
          <h2>Entrar</h2>
          <Entrar motivo={params.motivo} />
        </div>
      </section>
    </div>
  );
}
