import { VerificarMfa } from "@/componentes/mfa";

export const metadata = { title: "Verificar autenticador" };

export default function Verificar() {
  return (
    <div className="auth">
      <section className="hero">
        <div>
          <p className="olho">Segundo fator</p>
          <h1>Confirme que é você</h1>
        </div>
        <p>A sessão só segue depois do código do autenticador.</p>
      </section>
      <section className="painel-auth">
        <div className="caixa-auth">
          <h2>Código</h2>
          <VerificarMfa />
        </div>
      </section>
    </div>
  );
}
