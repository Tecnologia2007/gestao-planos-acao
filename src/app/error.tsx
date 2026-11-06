"use client";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="conteudo">
      <h1>Algo saiu do lugar</h1>
      <p>Não foi possível concluir esta tela. Tente de novo.</p>
      {error.digest ? <p className="sigilo">Referência: {error.digest}</p> : null}
      <button className="botao" type="button" onClick={() => reset()}>
        Tentar de novo
      </button>
    </div>
  );
}
