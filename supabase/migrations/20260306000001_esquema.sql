-- Cicobi Central Nordeste
-- Esquema de acompanhamento de auditorias e planos de ação.
-- Modelo: constatação (critério, condição, causa, efeito) → recomendação
-- → plano de ação → evidência → validação, com escalonamento e trilha.

create extension if not exists pgcrypto;

do $$ begin
  create type public.papel_usuario as enum ('admin', 'risco', 'auditor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_acesso as enum ('pendente', 'aprovado', 'revogado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_auditoria as enum (
    'planejada', 'em_andamento', 'relatorio', 'acompanhamento', 'encerrada', 'cancelada'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_auditoria as enum ('interna', 'externa', 'regulatoria', 'especial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.nivel_risco as enum ('baixo', 'medio', 'alto', 'critico');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.classificacao_constatacao as enum (
    'oportunidade_melhoria', 'baixa', 'media', 'alta', 'critica'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_constatacao as enum (
    'aberta', 'em_tratamento', 'aguardando_validacao', 'validada', 'encerrada', 'reaberta'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prioridade as enum ('baixa', 'media', 'alta', 'urgente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_plano as enum (
    'nao_iniciado', 'em_andamento', 'aguardando_evidencia', 'aguardando_validacao', 'concluido', 'cancelado'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.atendimento_plano as enum (
    'pendente', 'atende_integralmente', 'atende_parcialmente', 'nao_atende'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.resultado_validacao as enum ('aceita', 'aceita_com_ressalvas', 'rejeitada');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tipo_alerta as enum ('d15', 'd7', 'vencido');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.situacao_alerta as enum ('pendente', 'enviado', 'erro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.nivel_escalonamento as enum ('nenhum', 'responsavel', 'risco', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.status_atribuicao as enum ('pendente', 'aprovada', 'revogada');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique check (char_length(email) between 3 and 320),
  nome text not null default '' check (char_length(nome) <= 160),
  papel public.papel_usuario not null default 'risco',
  status_acesso public.status_acesso not null default 'pendente',
  acesso_expira_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.auditorias (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (char_length(codigo) between 3 and 40),
  titulo text not null check (char_length(titulo) between 5 and 200),
  objetivo text not null default '' check (char_length(objetivo) <= 4000),
  escopo text not null default '' check (char_length(escopo) <= 4000),
  criterio text not null default '' check (char_length(criterio) <= 2000),
  tipo public.tipo_auditoria not null default 'externa',
  status public.status_auditoria not null default 'planejada',
  nivel_risco public.nivel_risco not null default 'medio',
  unidade text not null default '' check (char_length(unidade) <= 160),
  periodo_inicio date,
  periodo_fim date,
  notas_sigilosas text,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint auditorias_periodo_chk check (
    periodo_fim is null or periodo_inicio is null or periodo_fim >= periodo_inicio
  )
);

comment on column public.auditorias.notas_sigilosas is
  'Texto cifrado pela aplicação (AES-256-GCM, prefixo v1). Não gravar segredo em claro.';

create table if not exists public.constatacoes (
  id uuid primary key default gen_random_uuid(),
  auditoria_id uuid not null references public.auditorias (id) on delete cascade,
  codigo text not null check (char_length(codigo) between 1 and 20),
  titulo text not null check (char_length(titulo) between 5 and 200),
  criterio text not null default '' check (char_length(criterio) <= 4000),
  condicao text not null default '' check (char_length(condicao) <= 8000),
  causa text not null default '' check (char_length(causa) <= 4000),
  efeito text not null default '' check (char_length(efeito) <= 4000),
  notas_sigilosas text,
  classificacao public.classificacao_constatacao not null default 'media',
  status public.status_constatacao not null default 'aberta',
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (auditoria_id, codigo)
);

comment on column public.constatacoes.notas_sigilosas is
  'Texto cifrado pela aplicação (AES-256-GCM, prefixo v1).';

create table if not exists public.recomendacoes (
  id uuid primary key default gen_random_uuid(),
  constatacao_id uuid not null references public.constatacoes (id) on delete cascade,
  descricao text not null check (char_length(descricao) between 10 and 4000),
  prioridade public.prioridade not null default 'media',
  prazo_sugerido date,
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.planos_acao (
  id uuid primary key default gen_random_uuid(),
  recomendacao_id uuid not null references public.recomendacoes (id) on delete cascade,
  descricao text not null check (char_length(descricao) between 10 and 4000),
  responsavel_id uuid references public.profiles (id) on delete set null,
  prazo date not null,
  status public.status_plano not null default 'nao_iniciado',
  atendimento public.atendimento_plano not null default 'pendente',
  justificativa_atendimento text check (justificativa_atendimento is null or char_length(justificativa_atendimento) <= 4000),
  escalonamento public.nivel_escalonamento not null default 'nenhum',
  criado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint planos_justificativa_chk check (
    atendimento in ('pendente', 'atende_integralmente')
    or (
      justificativa_atendimento is not null
      and char_length(trim(justificativa_atendimento)) >= 10
    )
  )
);

create table if not exists public.evidencias (
  id uuid primary key default gen_random_uuid(),
  plano_acao_id uuid not null references public.planos_acao (id) on delete cascade,
  descricao text not null check (char_length(descricao) between 5 and 4000),
  referencia text not null default '' check (char_length(referencia) <= 1000),
  enviado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.validacoes (
  id uuid primary key default gen_random_uuid(),
  plano_acao_id uuid not null references public.planos_acao (id) on delete cascade,
  resultado public.resultado_validacao not null,
  comentario text check (comentario is null or char_length(comentario) <= 4000),
  validado_por uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint validacoes_comentario_chk check (
    resultado = 'aceita'
    or (comentario is not null and char_length(trim(comentario)) >= 10)
  )
);

create table if not exists public.atribuicoes_auditor (
  id uuid primary key default gen_random_uuid(),
  auditor_id uuid not null references public.profiles (id) on delete cascade,
  auditoria_id uuid not null references public.auditorias (id) on delete cascade,
  status public.status_atribuicao not null default 'pendente',
  aprovado_por uuid references public.profiles (id) on delete set null,
  aprovado_em timestamptz,
  expira_em timestamptz,
  revogado_por uuid references public.profiles (id) on delete set null,
  revogado_em timestamptz,
  motivo_revogacao text check (motivo_revogacao is null or char_length(motivo_revogacao) <= 1000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (auditor_id, auditoria_id)
);

create table if not exists public.alertas (
  id uuid primary key default gen_random_uuid(),
  plano_acao_id uuid not null references public.planos_acao (id) on delete cascade,
  tipo public.tipo_alerta not null,
  situacao public.situacao_alerta not null default 'pendente',
  dias_restantes integer not null,
  destinatarios text[] not null default '{}',
  mensagem_id text,
  ultimo_erro text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (plano_acao_id, tipo)
);

create table if not exists public.trilha_auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id uuid,
  operacao text not null check (operacao in ('INSERT', 'UPDATE', 'DELETE')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid references public.profiles (id) on delete set null,
  criado_em timestamptz not null default now()
);

create table if not exists public.logs_acesso (
  id bigint generated always as identity primary key,
  usuario_id uuid references public.profiles (id) on delete set null,
  acao text not null check (char_length(acao) between 1 and 80),
  recurso text not null default '' check (char_length(recurso) <= 300),
  ip text not null default '' check (char_length(ip) <= 64),
  agente text not null default '' check (char_length(agente) <= 300),
  criado_em timestamptz not null default now()
);

create index if not exists auditorias_status_idx on public.auditorias (status);
create index if not exists auditorias_nivel_idx on public.auditorias (nivel_risco);
create index if not exists constatacoes_auditoria_idx on public.constatacoes (auditoria_id);
create index if not exists recomendacoes_constatacao_idx on public.recomendacoes (constatacao_id);
create index if not exists planos_recomendacao_idx on public.planos_acao (recomendacao_id);
create index if not exists planos_responsavel_idx on public.planos_acao (responsavel_id);
create index if not exists planos_prazo_idx on public.planos_acao (prazo);
create index if not exists evidencias_plano_idx on public.evidencias (plano_acao_id);
create index if not exists validacoes_plano_idx on public.validacoes (plano_acao_id);
create index if not exists atribuicoes_auditor_idx on public.atribuicoes_auditor (auditor_id);
create index if not exists atribuicoes_auditoria_idx on public.atribuicoes_auditor (auditoria_id);
create index if not exists alertas_plano_idx on public.alertas (plano_acao_id);
create index if not exists trilha_registro_idx on public.trilha_auditoria (tabela, registro_id);
create index if not exists trilha_criado_idx on public.trilha_auditoria (criado_em desc);
create index if not exists logs_usuario_idx on public.logs_acesso (usuario_id, criado_em desc);

-- Criptografia em repouso no nível do campo, para uso no SQL Editor (postgres).
-- A aplicação cifra com AES-256-GCM no servidor e não envia a chave ao banco
-- a partir do navegador. Estas funções ficam restritas ao service_role.

create or replace function public.cifrar_pgcrypto(conteudo text, chave text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
begin
  if conteudo is null then
    return null;
  end if;
  if chave is null or char_length(chave) < 16 then
    raise exception 'Chave de criptografia inválida';
  end if;
  return encode(
    pgp_sym_encrypt(conteudo, chave, 'compress-algo=1, cipher-algo=aes256'),
    'base64'
  );
end;
$$;

create or replace function public.decifrar_pgcrypto(conteudo text, chave text)
returns text
language plpgsql
immutable
set search_path = public, extensions
as $$
begin
  if conteudo is null then
    return null;
  end if;
  if chave is null or char_length(chave) < 16 then
    raise exception 'Chave de criptografia inválida';
  end if;
  return pgp_sym_decrypt(decode(conteudo, 'base64'), chave);
end;
$$;

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists profiles_atualizado on public.profiles;
create trigger profiles_atualizado before update on public.profiles
for each row execute function public.tocar_atualizado_em();

drop trigger if exists auditorias_atualizado on public.auditorias;
create trigger auditorias_atualizado before update on public.auditorias
for each row execute function public.tocar_atualizado_em();

drop trigger if exists constatacoes_atualizado on public.constatacoes;
create trigger constatacoes_atualizado before update on public.constatacoes
for each row execute function public.tocar_atualizado_em();

drop trigger if exists recomendacoes_atualizado on public.recomendacoes;
create trigger recomendacoes_atualizado before update on public.recomendacoes
for each row execute function public.tocar_atualizado_em();

drop trigger if exists planos_atualizado on public.planos_acao;
create trigger planos_atualizado before update on public.planos_acao
for each row execute function public.tocar_atualizado_em();

drop trigger if exists atribuicoes_atualizado on public.atribuicoes_auditor;
create trigger atribuicoes_atualizado before update on public.atribuicoes_auditor
for each row execute function public.tocar_atualizado_em();

drop trigger if exists alertas_atualizado on public.alertas;
create trigger alertas_atualizado before update on public.alertas
for each row execute function public.tocar_atualizado_em();

create or replace function public.registrar_trilha()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  registro uuid;
begin
  if tg_op = 'DELETE' then
    registro = old.id;
  else
    registro = new.id;
  end if;

  insert into public.trilha_auditoria (
    tabela, registro_id, operacao, dados_anteriores, dados_novos, usuario_id
  ) values (
    tg_table_name,
    registro,
    tg_op,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid()
  );

  return coalesce(new, old);
end;
$$;

drop trigger if exists trilha_profiles on public.profiles;
create trigger trilha_profiles after insert or update or delete on public.profiles
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_auditorias on public.auditorias;
create trigger trilha_auditorias after insert or update or delete on public.auditorias
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_constatacoes on public.constatacoes;
create trigger trilha_constatacoes after insert or update or delete on public.constatacoes
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_recomendacoes on public.recomendacoes;
create trigger trilha_recomendacoes after insert or update or delete on public.recomendacoes
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_planos on public.planos_acao;
create trigger trilha_planos after insert or update or delete on public.planos_acao
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_evidencias on public.evidencias;
create trigger trilha_evidencias after insert or update or delete on public.evidencias
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_validacoes on public.validacoes;
create trigger trilha_validacoes after insert or update or delete on public.validacoes
for each row execute function public.registrar_trilha();

drop trigger if exists trilha_atribuicoes on public.atribuicoes_auditor;
create trigger trilha_atribuicoes after insert or update or delete on public.atribuicoes_auditor
for each row execute function public.registrar_trilha();

-- Papel e acesso só mudam por administrador, pelo service role ou pelo SQL Editor.
create or replace function public.proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.papel = 'admin' and p.status_acesso = 'aprovado'
      and (p.acesso_expira_em is null or p.acesso_expira_em > now())
  ) then
    return new;
  end if;

  if new.papel is distinct from old.papel
     or new.status_acesso is distinct from old.status_acesso
     or new.acesso_expira_em is distinct from old.acesso_expira_em
     or new.email is distinct from old.email
     or new.id is distinct from old.id then
    raise exception 'Somente administradores alteram acesso, papel ou e-mail';
  end if;

  return new;
end;
$$;

drop trigger if exists proteger_perfil on public.profiles;
create trigger proteger_perfil before update on public.profiles
for each row execute function public.proteger_perfil();

-- Perfil nasce pendente. O service role (convite do admin) pode indicar papel.
create or replace function public.criar_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  papel_inicial public.papel_usuario := 'risco';
  status_inicial public.status_acesso := 'pendente';
  nome_inicial text := coalesce(meta->>'nome', split_part(coalesce(new.email, 'usuario'), '@', 1));
begin
  if coalesce(auth.role(), '') = 'service_role' then
    if meta->>'papel' in ('admin', 'risco', 'auditor') then
      papel_inicial := (meta->>'papel')::public.papel_usuario;
    end if;
    if meta->>'status_acesso' in ('pendente', 'aprovado', 'revogado') then
      status_inicial := (meta->>'status_acesso')::public.status_acesso;
    elsif papel_inicial <> 'auditor' then
      status_inicial := 'aprovado';
    end if;
  end if;

  insert into public.profiles (id, email, nome, papel, status_acesso)
  values (new.id, coalesce(new.email, ''), left(nome_inicial, 160), papel_inicial, status_inicial)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.criar_perfil();

create or replace function public.registrar_acesso(
  p_acao text,
  p_recurso text,
  p_ip text,
  p_agente text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;

  insert into public.logs_acesso (usuario_id, acao, recurso, ip, agente)
  values (
    auth.uid(),
    left(coalesce(p_acao, 'consulta'), 80),
    left(coalesce(p_recurso, ''), 300),
    left(coalesce(p_ip, ''), 64),
    left(coalesce(p_agente, ''), 300)
  );
end;
$$;

-- RLS ligada já aqui. As policies entram na migration seguinte.
-- Sem policy, o padrão é negar para anon e authenticated.
do $$
declare
  tabela text;
begin
  foreach tabela in array array[
    'profiles', 'auditorias', 'constatacoes', 'recomendacoes', 'planos_acao',
    'evidencias', 'validacoes', 'atribuicoes_auditor', 'alertas',
    'trilha_auditoria', 'logs_acesso'
  ]
  loop
    execute format('alter table public.%I enable row level security', tabela);
    execute format('alter table public.%I force row level security', tabela);
  end loop;
end $$;
