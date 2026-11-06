-- RLS alinhada aos papéis.
-- admin: governa acesso e enxerga tudo o que riscos enxergam.
-- risco: lê e escreve o ciclo da auditoria; não governa usuários.
-- auditor externo: somente leitura das auditorias atribuídas, depois de
-- aprovado, não revogado e dentro da validade (perfil e atribuição).
-- anon: sem grants e sem policies. service_role ignora a RLS de propósito
-- e só existe no servidor (cron e convites).

create or replace function public.acesso_liberado()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.status_acesso = 'aprovado'
      and (p.acesso_expira_em is null or p.acesso_expira_em > now())
  );
$$;

create or replace function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = public
as $$
  select p.papel from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.acesso_liberado() and public.papel_atual() = 'admin';
$$;

create or replace function public.eh_risco_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.acesso_liberado() and public.papel_atual() in ('admin', 'risco');
$$;

create or replace function public.auditor_ve_auditoria(alvo uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.atribuicoes_auditor a on a.auditor_id = p.id
    where p.id = auth.uid()
      and p.papel = 'auditor'
      and p.status_acesso = 'aprovado'
      and (p.acesso_expira_em is null or p.acesso_expira_em > now())
      and a.auditoria_id = alvo
      and a.status = 'aprovada'
      and a.revogado_em is null
      and (a.expira_em is null or a.expira_em > now())
  );
$$;

create or replace function public.auditoria_da_constatacao(alvo uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.auditoria_id from public.constatacoes c where c.id = alvo;
$$;

create or replace function public.auditoria_do_plano(alvo uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select c.auditoria_id
  from public.planos_acao p
  join public.recomendacoes r on r.id = p.recomendacao_id
  join public.constatacoes c on c.id = r.constatacao_id
  where p.id = alvo;
$$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'profiles',
    'auditorias',
    'constatacoes',
    'recomendacoes',
    'planos_acao',
    'evidencias',
    'validacoes',
    'atribuicoes_auditor',
    'alertas',
    'trilha_auditoria',
    'logs_acesso'
  ]
  loop
    execute format('revoke all on table public.%I from public, anon', tabela);
    execute format('alter table public.%I enable row level security', tabela);
    execute format('alter table public.%I force row level security', tabela);
  end loop;
end $$;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.auditorias to authenticated;
grant select, insert, update on public.constatacoes to authenticated;
grant select, insert, update on public.recomendacoes to authenticated;
grant select, insert, update on public.planos_acao to authenticated;
grant select, insert, update on public.evidencias to authenticated;
grant select, insert, update on public.validacoes to authenticated;
grant select, insert, update on public.atribuicoes_auditor to authenticated;
grant select on public.alertas to authenticated;
grant select on public.trilha_auditoria to authenticated;
grant select on public.logs_acesso to authenticated;

revoke all on function public.cifrar_pgcrypto(text, text) from public, anon, authenticated;
revoke all on function public.decifrar_pgcrypto(text, text) from public, anon, authenticated;
grant execute on function public.cifrar_pgcrypto(text, text) to service_role;
grant execute on function public.decifrar_pgcrypto(text, text) to service_role;

revoke all on function public.criar_perfil() from public, anon, authenticated;
revoke all on function public.registrar_trilha() from public, anon;
revoke all on function public.tocar_atualizado_em() from public, anon;
revoke all on function public.proteger_perfil() from public, anon;
grant execute on function public.registrar_trilha() to authenticated, service_role;
grant execute on function public.tocar_atualizado_em() to authenticated, service_role;
grant execute on function public.proteger_perfil() to authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant execute on function public.criar_perfil() to supabase_auth_admin;
  end if;
end $$;

revoke all on function public.acesso_liberado() from public, anon;
revoke all on function public.papel_atual() from public, anon;
revoke all on function public.eh_admin() from public, anon;
revoke all on function public.eh_risco_ou_admin() from public, anon;
revoke all on function public.auditor_ve_auditoria(uuid) from public, anon;
revoke all on function public.auditoria_da_constatacao(uuid) from public, anon;
revoke all on function public.auditoria_do_plano(uuid) from public, anon;
grant execute on function public.acesso_liberado() to authenticated;
grant execute on function public.papel_atual() to authenticated;
grant execute on function public.eh_admin() to authenticated;
grant execute on function public.eh_risco_ou_admin() to authenticated;
grant execute on function public.auditor_ve_auditoria(uuid) to authenticated;
grant execute on function public.auditoria_da_constatacao(uuid) to authenticated;
grant execute on function public.auditoria_do_plano(uuid) to authenticated;

revoke all on function public.registrar_acesso(text, text, text, text) from public, anon;
grant execute on function public.registrar_acesso(text, text, text, text) to authenticated;

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or public.eh_risco_ou_admin()
  or exists (
    select 1
    from public.planos_acao pl
    join public.recomendacoes r on r.id = pl.recomendacao_id
    join public.constatacoes c on c.id = r.constatacao_id
    where pl.responsavel_id = profiles.id
      and public.auditor_ve_auditoria(c.auditoria_id)
  )
);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
for update to authenticated
using (id = auth.uid() or public.eh_admin())
with check (id = auth.uid() or public.eh_admin());

drop policy if exists auditorias_select on public.auditorias;
create policy auditorias_select on public.auditorias
for select to authenticated
using (public.eh_risco_ou_admin() or public.auditor_ve_auditoria(id));

drop policy if exists auditorias_insert on public.auditorias;
create policy auditorias_insert on public.auditorias
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists auditorias_update on public.auditorias;
create policy auditorias_update on public.auditorias
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists constatacoes_select on public.constatacoes;
create policy constatacoes_select on public.constatacoes
for select to authenticated
using (public.eh_risco_ou_admin() or public.auditor_ve_auditoria(auditoria_id));

drop policy if exists constatacoes_insert on public.constatacoes;
create policy constatacoes_insert on public.constatacoes
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists constatacoes_update on public.constatacoes;
create policy constatacoes_update on public.constatacoes
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists recomendacoes_select on public.recomendacoes;
create policy recomendacoes_select on public.recomendacoes
for select to authenticated
using (
  public.eh_risco_ou_admin()
  or public.auditor_ve_auditoria(public.auditoria_da_constatacao(constatacao_id))
);

drop policy if exists recomendacoes_insert on public.recomendacoes;
create policy recomendacoes_insert on public.recomendacoes
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists recomendacoes_update on public.recomendacoes;
create policy recomendacoes_update on public.recomendacoes
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists planos_acao_select on public.planos_acao;
create policy planos_acao_select on public.planos_acao
for select to authenticated
using (
  public.eh_risco_ou_admin()
  or public.auditor_ve_auditoria(public.auditoria_do_plano(id))
);

drop policy if exists planos_acao_insert on public.planos_acao;
create policy planos_acao_insert on public.planos_acao
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists planos_acao_update on public.planos_acao;
create policy planos_acao_update on public.planos_acao
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists evidencias_select on public.evidencias;
create policy evidencias_select on public.evidencias
for select to authenticated
using (
  public.eh_risco_ou_admin()
  or public.auditor_ve_auditoria(public.auditoria_do_plano(plano_acao_id))
);

drop policy if exists evidencias_insert on public.evidencias;
create policy evidencias_insert on public.evidencias
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists evidencias_update on public.evidencias;
create policy evidencias_update on public.evidencias
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists validacoes_select on public.validacoes;
create policy validacoes_select on public.validacoes
for select to authenticated
using (
  public.eh_risco_ou_admin()
  or public.auditor_ve_auditoria(public.auditoria_do_plano(plano_acao_id))
);

drop policy if exists validacoes_insert on public.validacoes;
create policy validacoes_insert on public.validacoes
for insert to authenticated
with check (public.eh_risco_ou_admin());

drop policy if exists validacoes_update on public.validacoes;
create policy validacoes_update on public.validacoes
for update to authenticated
using (public.eh_risco_ou_admin())
with check (public.eh_risco_ou_admin());

drop policy if exists atribuicoes_select on public.atribuicoes_auditor;
create policy atribuicoes_select on public.atribuicoes_auditor
for select to authenticated
using (public.eh_admin() or auditor_id = auth.uid());

drop policy if exists atribuicoes_insert on public.atribuicoes_auditor;
create policy atribuicoes_insert on public.atribuicoes_auditor
for insert to authenticated
with check (public.eh_admin());

drop policy if exists atribuicoes_update on public.atribuicoes_auditor;
create policy atribuicoes_update on public.atribuicoes_auditor
for update to authenticated
using (public.eh_admin())
with check (public.eh_admin());

-- Alertas são gravados só pelo service role (cron). Usuário autenticado apenas lê.
-- Não há policy de insert: isso impede marcar um alerta como enviado pelo cliente.
drop policy if exists alertas_select on public.alertas;
create policy alertas_select on public.alertas
for select to authenticated
using (public.eh_risco_ou_admin());

drop policy if exists trilha_select on public.trilha_auditoria;
create policy trilha_select on public.trilha_auditoria
for select to authenticated
using (public.eh_risco_ou_admin());

drop policy if exists logs_select on public.logs_acesso;
create policy logs_select on public.logs_acesso
for select to authenticated
using (public.eh_admin());
