export function traduzirErroAuth(mensagem: string): string {
  if (/invalid login credentials/i.test(mensagem)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(mensagem)) return "E-mail ainda não confirmado.";
  if (/mfa/i.test(mensagem) && /factor/i.test(mensagem)) {
    return "Não foi possível validar o segundo fator. Confira o código e tente de novo.";
  }
  return "Não foi possível entrar. Tente de novo.";
}

export function traduzirErroBanco(mensagem: string, codigo?: string): string {
  if (codigo === "23505") return "Já existe um registro com esse identificador.";
  if (codigo === "23514" || /planos_justificativa_chk|validacoes_comentario_chk/i.test(mensagem)) {
    return "A justificativa ou o comentário é obrigatório neste caso (mínimo de 10 caracteres).";
  }
  if (/row-level security|permission denied/i.test(mensagem)) {
    return "Você não tem permissão para esta operação.";
  }
  if (/schema cache|does not exist|relation/i.test(mensagem)) {
    return "As tabelas ainda não existem neste projeto. Aplique as migrations do diretório supabase/migrations.";
  }
  return "Não foi possível salvar. Verifique os dados e tente de novo.";
}

export function mensagemConsulta(mensagem: string | undefined): string | null {
  if (!mensagem) return null;
  if (/schema cache|does not exist|relation/i.test(mensagem)) {
    return "As tabelas ainda não existem neste projeto Supabase. Aplique as migrations descritas no README.";
  }
  return "Não foi possível carregar os dados.";
}
