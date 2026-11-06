export const PAPEIS = ["admin", "risco", "auditor"] as const;
export type Papel = (typeof PAPEIS)[number];
export type StatusAcesso = "pendente" | "aprovado" | "revogado";

export type PerfilAcesso = {
  papel: Papel;
  status_acesso: StatusAcesso;
  acesso_expira_em: string | null;
};

export function acessoLiberado(perfil: PerfilAcesso, agora: Date): boolean {
  if (perfil.status_acesso !== "aprovado") return false;
  if (!perfil.acesso_expira_em) return true;
  const expira = new Date(perfil.acesso_expira_em).getTime();
  return Number.isFinite(expira) && expira > agora.getTime();
}

export function podeEscrever(perfil: { papel: Papel }): boolean {
  return perfil.papel === "admin" || perfil.papel === "risco";
}

export function podeAdministrar(perfil: { papel: Papel }): boolean {
  return perfil.papel === "admin";
}

export function atribuicaoVisivel(
  atribuicao: { status: "pendente" | "aprovada" | "revogada"; revogado_em: string | null; expira_em: string | null },
  agora: Date,
): boolean {
  if (atribuicao.status !== "aprovada" || atribuicao.revogado_em) return false;
  if (!atribuicao.expira_em) return true;
  const expira = new Date(atribuicao.expira_em).getTime();
  return Number.isFinite(expira) && expira > agora.getTime();
}
