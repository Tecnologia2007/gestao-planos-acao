-- Ação manual, uma vez, no SQL Editor do NOVO projeto.
-- 1. Crie o usuário do Tony em Authentication → Users.
-- 2. Troque o e-mail abaixo e execute.
-- 3. Confira se a consulta seguinte retorna uma linha.

update public.profiles
set
  papel = 'admin',
  status_acesso = 'aprovado',
  acesso_expira_em = null,
  nome = 'Tony'
where email = 'TROQUE_PELO_EMAIL_DO_TONY';

select id, email, nome, papel, status_acesso
from public.profiles
where email = 'TROQUE_PELO_EMAIL_DO_TONY';
