import { AtivarMfa } from "@/componentes/mfa";

export const metadata = { title: "Ativar autenticador" };

export default function Ativar() {
  return (
    <div className="auth">
      <section className="hero">
        <div>
          <p className="olho">Segundo fator obrigatório</p>
          <h1>Ative o autenticador</h1>
        </div>
        <p>O acesso aos dados da auditoria só abre com nível aal2. Use um aplicativo TOTP, como o do seu celular.</p>
      </section>
      <section className="painel-auth">
        <div className="caixa-auth">
          <h2>Aplicativo autenticador</h2>
          <AtivarMfa />
        </div>
      </section>
    </div>
  );
}
