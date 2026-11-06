import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="conteudo">
      <h1>Não encontramos esta página</h1>
      <p>O registro pode ter saído do seu acesso ou o endereço está incorreto.</p>
      <Link className="botao" href="/">Voltar ao painel</Link>
    </div>
  );
}
