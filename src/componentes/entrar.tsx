"use client";

import { useState } from "react";
import { traduzirErroAuth } from "@/dominio/erros";
import { criarClienteNavegador } from "@/lib/supabase/navegador";

export function Entrar({ motivo }: { motivo?: string }) {
  const [erro, setErro] = useState("");
  const [pendente, setPendente] = useState(false);

  async function aoEnviar(formData: FormData) {
    setPendente(true);
    setErro("");
    const supabase = criarClienteNavegador();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("senha") ?? ""),
    });
    setPendente(false);
    if (error) {
      setErro(traduzirErroAuth(error.message));
      return;
    }
    window.location.assign("/");
  }

  return (
    <form action={aoEnviar} className="auth">
      <label className="campo">
        <span>E-mail</span>
        <input name="email" type="email" autoComplete="username" required />
      </label>
      <label className="campo">
        <span>Senha</span>
        <input name="senha" type="password" autoComplete="current-password" required />
      </label>
      {motivo === "inatividade" ? <p className="aviso">Sua sessão encerrou por inatividade. Entre de novo.</p> : null}
      {erro ? <p className="erro" role="alert">{erro}</p> : null}
      <button className="botao" type="submit" disabled={pendente}>
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
