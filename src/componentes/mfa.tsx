"use client";

import { useState } from "react";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function AtivarMfa() {
  const [qr, setQr] = useState("");
  const [segredo, setSegredo] = useState("");
  const [fator, setFator] = useState("");
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);

  async function preparar() {
    setPendente(true);
    setErro("");
    const supabase = criarClienteNavegador();
    const { data: lista } = await supabase.auth.mfa.listFactors();
    for (const item of lista?.all ?? []) {
      if (item.factor_type === "totp" && item.status !== "verified") {
        await supabase.auth.mfa.unenroll({ factorId: item.id });
      }
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Cicobi Auditorias" });
    setPendente(false);
    if (error || !data?.totp) {
      setErro("Não foi possível iniciar o autenticador. Confira se o TOTP está habilitado no projeto Supabase.");
      return;
    }
    setFator(data.id);
    setQr(data.totp.qr_code);
    setSegredo(data.totp.secret);
  }

  async function confirmar(formData: FormData) {
    setPendente(true);
    setErro("");
    const supabase = criarClienteNavegador();
    const { data: desafio, error: erroDesafio } = await supabase.auth.mfa.challenge({ factorId: fator });
    if (erroDesafio || !desafio) {
      setPendente(false);
      setErro("Não foi possível validar o código.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: fator,
      challengeId: desafio.id,
      code: String(formData.get("codigo") ?? "").trim(),
    });
    setPendente(false);
    if (error) {
      setErro("Código incorreto. Use o código atual do aplicativo autenticador.");
      return;
    }
    window.location.assign("/");
  }

  return (
    <div>
      {!qr ? (
        <button className="botao" type="button" onClick={preparar} disabled={pendente}>
          {pendente ? "Preparando…" : "Gerar chave do autenticador"}
        </button>
      ) : (
        <form action={confirmar}>
          {/* O QR vem do Supabase como data URL SVG. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="qr" alt="QR Code do autenticador" src={qr} />
          <p className="sigilo">Se não puder ler o QR, digite esta chave: <span className="senha">{segredo}</span></p>
          <label className="campo">
            <span>Código de 6 dígitos</span>
            <input name="codigo" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" />
          </label>
          <button className="botao" type="submit" disabled={pendente}>
            {pendente ? "Confirmando…" : "Ativar e entrar"}
          </button>
        </form>
      )}
      {erro ? <p className="erro" role="alert">{erro}</p> : null}
    </div>
  );
}

export function VerificarMfa() {
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);

  async function confirmar(formData: FormData) {
    setPendente(true);
    setErro("");
    const supabase = criarClienteNavegador();
    const { data: fatores, error: erroFatores } = await supabase.auth.mfa.listFactors();
    const fator = fatores?.totp?.[0];
    if (erroFatores || !fator) {
      setPendente(false);
      setErro("Nenhum autenticador encontrado. Ative o MFA primeiro.");
      return;
    }
    const { data: desafio, error: erroDesafio } = await supabase.auth.mfa.challenge({ factorId: fator.id });
    if (erroDesafio || !desafio) {
      setPendente(false);
      setErro("Não foi possível iniciar a verificação.");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: fator.id,
      challengeId: desafio.id,
      code: String(formData.get("codigo") ?? "").trim(),
    });
    setPendente(false);
    if (error) {
      setErro("Código incorreto ou expirado.");
      return;
    }
    window.location.assign("/");
  }

  return (
    <form action={confirmar}>
      <label className="campo">
        <span>Código do aplicativo autenticador</span>
        <input name="codigo" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" />
      </label>
      {erro ? <p className="erro" role="alert">{erro}</p> : null}
      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Verificando…" : "Confirmar"}
      </button>
    </form>
  );
}
