export const metadata = { title: "Configuração" };

export default function Configuracao() {
  return (
    <div className="auth">
      <section className="hero">
        <div>
          <p className="olho">Cicobi Central Nordeste</p>
          <h1>Falta ligar o projeto novo</h1>
        </div>
        <p>A aplicação abre sem segredo no código. Os endereços do Supabase ficam no arquivo de ambiente, fora do Git.</p>
      </section>
      <section className="painel-auth">
        <div className="caixa-auth">
          <h2>Para rodar aqui</h2>
          <ol className="lista-simples">
            <li>Copie <code>.env.example</code> para <code>.env.local</code>.</li>
            <li>Crie um projeto novo no Supabase e preencha a URL e a chave anon.</li>
            <li>Aplique as migrations em <code>supabase/migrations</code>.</li>
            <li>Rode <code>npm run dev</code> de novo.</li>
          </ol>
          <p className="sigilo">O passo a passo completo, inclusive Resend, MFA e Vercel, está no README.</p>
        </div>
      </section>
    </div>
  );
}
