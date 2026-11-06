import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const raiz = process.cwd();
const esquema = readFileSync(join(raiz, "supabase/migrations/20260306000001_esquema.sql"), "utf8");
const rls = readFileSync(join(raiz, "supabase/migrations/20260306000002_rls.sql"), "utf8");
const sql = `${esquema}\n${rls}`;

const TABELAS = [
  "profiles",
  "auditorias",
  "constatacoes",
  "recomendacoes",
  "planos_acao",
  "evidencias",
  "validacoes",
  "atribuicoes_auditor",
  "alertas",
  "trilha_auditoria",
  "logs_acesso",
];

const POLITICAS = [
  "profiles_select",
  "profiles_update",
  "auditorias_select",
  "auditorias_insert",
  "auditorias_update",
  "constatacoes_select",
  "constatacoes_insert",
  "constatacoes_update",
  "recomendacoes_select",
  "recomendacoes_insert",
  "recomendacoes_update",
  "planos_acao_select",
  "planos_acao_insert",
  "planos_acao_update",
  "evidencias_select",
  "evidencias_insert",
  "evidencias_update",
  "validacoes_select",
  "validacoes_insert",
  "validacoes_update",
  "atribuicoes_select",
  "atribuicoes_insert",
  "atribuicoes_update",
  "alertas_select",
  "trilha_select",
  "logs_select",
];

function arquivos(diretorio: string): string[] {
  return readdirSync(diretorio).flatMap((nome) => {
    const caminho = join(diretorio, nome);
    if (statSync(caminho).isDirectory()) return arquivos(caminho);
    return [caminho];
  });
}

describe("RLS nas migrations", () => {
  it("liga e força RLS em todas as tabelas e revoga o anon", () => {
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("force row level security");
    for (const tabela of TABELAS) {
      const citado = sql.includes(`'${tabela}'`) || sql.includes(`public.${tabela} enable row level security`);
      expect(citado, tabela).toBe(true);
    }
    expect(rls).toContain("revoke all on table public.%I from public, anon");
    expect(rls).not.toMatch(/create policy[\s\S]*to anon/);
  });

  it("declara as policies esperadas e não deixa o cliente gravar alerta", () => {
    for (const politica of POLITICAS) {
      expect(rls).toContain(`create policy ${politica} `);
      expect(rls).toContain(`for select to authenticated`.includes("select") ? "to authenticated" : "to authenticated");
    }
    expect(rls).not.toContain("alertas_insert");
    expect(rls).not.toContain("policy alertas_update");
    expect(sql).toContain("unique (plano_acao_id, tipo)");
    expect(sql).toContain("planos_justificativa_chk");
    expect(sql).toContain("validacoes_comentario_chk");
  });

  it("separa papéis e a leitura do auditor externo", () => {
    expect(rls).toContain("public.eh_risco_ou_admin()");
    expect(rls).toContain("public.auditor_ve_auditoria");
    expect(rls).toContain("a.status = 'aprovada'");
    expect(rls).toContain("a.revogado_em is null");
    expect(rls).toContain("p.status_acesso = 'aprovado'");
    expect(rls).toContain("public.eh_admin()");
    expect(esquema).toContain("Somente administradores alteram acesso");
  });

  it("oferece pgcrypto sem expor a função ao authenticated", () => {
    expect(esquema).toContain("create extension if not exists pgcrypto");
    expect(esquema).toContain("cipher-algo=aes256");
    expect(rls).toContain("revoke all on function public.cifrar_pgcrypto(text, text) from public, anon, authenticated");
    expect(rls).toContain("revoke all on function public.decifrar_pgcrypto(text, text) from public, anon, authenticated");
    expect(rls).toContain("grant execute on function public.cifrar_pgcrypto(text, text) to service_role");
  });
});

describe("segredos fora do cliente", () => {
  it("não referencia a service role em componentes de navegador", () => {
    const fontes = arquivos(join(raiz, "src")).filter((arquivo) => /\.(ts|tsx)$/.test(arquivo));
    const clientes = fontes.filter((arquivo) => readFileSync(arquivo, "utf8").includes('"use client"'));
    for (const arquivo of clientes) {
      const conteudo = readFileSync(arquivo, "utf8");
      expect(conteudo).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
      expect(conteudo).not.toContain("ENCRYPTION_KEY");
      expect(conteudo).not.toContain("RESEND_API_KEY");
      expect(conteudo).not.toContain("CRON_SECRET");
      expect(conteudo).not.toContain("criarClienteAdmin");
    }
    const admin = readFileSync(join(raiz, "src/lib/supabase/admin.ts"), "utf8");
    expect(admin).toContain("server-only");
    expect(admin).toContain("SUPABASE_SERVICE_ROLE_KEY");
    const publico = fontes.filter((arquivo) => /navegador|componentes|app\/login|app\/mfa/.test(relative(raiz, arquivo)));
    expect(publico.length).toBeGreaterThan(0);
  });
});
