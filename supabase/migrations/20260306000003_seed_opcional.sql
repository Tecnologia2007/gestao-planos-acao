-- Seed opcional para um banco novo. Não cria usuários.
-- Os prazos são relativos a current_date para exercitar vencido, 7 dias e 15 dias.
-- Pode ser executado de novo: registros existentes são mantidos.

insert into public.auditorias (
  id, codigo, titulo, objetivo, escopo, criterio, tipo, status, nivel_risco, unidade,
  periodo_inicio, periodo_fim
) values (
  '11111111-1111-4111-8111-111111111111',
  'AUD-EXEMPLO-001',
  'Auditoria exemplo — concessão de crédito (seed)',
  'Avaliar se a concessão na carteira comercial segue alçada, cadastro e registro da garantia.',
  'Contratos novos da unidade exemplo no trimestre anterior. Fora de escopo: renegociações.',
  'Política de crédito da central e critérios de alçada vigentes.',
  'externa',
  'acompanhamento',
  'alto',
  'Unidade exemplo',
  current_date - 90,
  current_date - 60
)
on conflict (codigo) do nothing;

insert into public.constatacoes (
  id, auditoria_id, codigo, titulo, criterio, condicao, causa, efeito, classificacao, status
)
select
  '22222222-2222-4222-8222-222222222222',
  a.id,
  'C-01',
  'Garantia registrada depois da liberação',
  'A garantia deve estar formalizada antes da liberação do recurso.',
  'Em amostra de contratos, o registro ocorreu após a liberação.',
  'A conferência da mesa não bloqueia a liberação sem o protocolo do registro.',
  'Exposição sem garantia oponível no período entre a liberação e o registro.',
  'alta',
  'em_tratamento'
from public.auditorias a
where a.codigo = 'AUD-EXEMPLO-001'
  and not exists (
    select 1 from public.constatacoes c where c.id = '22222222-2222-4222-8222-222222222222'
  );

insert into public.recomendacoes (id, constatacao_id, descricao, prioridade, prazo_sugerido)
select
  '33333333-3333-4333-8333-333333333333',
  c.id,
  'Incluir trava sistêmica que impeça a liberação sem protocolo válido de garantia.',
  'alta',
  current_date + 30
from public.constatacoes c
where c.id = '22222222-2222-4222-8222-222222222222'
  and not exists (
    select 1 from public.recomendacoes r where r.id = '33333333-3333-4333-8333-333333333333'
  );

insert into public.planos_acao (
  id, recomendacao_id, descricao, prazo, status, atendimento, justificativa_atendimento, escalonamento
)
select * from (
  values
    (
      '44444444-4444-4444-8444-444444444441'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Mapear contratos liberados sem protocolo e regularizar o registro.',
      current_date - 3,
      'em_andamento'::public.status_plano,
      'atende_parcialmente'::public.atendimento_plano,
      'A rotina cobre contratos novos. A carteira antiga ainda está em regularização.',
      'nenhum'::public.nivel_escalonamento
    ),
    (
      '44444444-4444-4444-8444-444444444442'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Especificar a trava no sistema de crédito e homologar com a mesa.',
      current_date + 4,
      'em_andamento'::public.status_plano,
      'pendente'::public.atendimento_plano,
      null,
      'nenhum'::public.nivel_escalonamento
    ),
    (
      '44444444-4444-4444-8444-444444444443'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Treinar a mesa de crédito na nova conferência antes da liberação.',
      current_date + 12,
      'nao_iniciado'::public.status_plano,
      'pendente'::public.atendimento_plano,
      null,
      'nenhum'::public.nivel_escalonamento
    ),
    (
      '44444444-4444-4444-8444-444444444444'::uuid,
      '33333333-3333-4333-8333-333333333333'::uuid,
      'Revisar a política de alçada e publicar a versão atualizada.',
      current_date + 45,
      'nao_iniciado'::public.status_plano,
      'pendente'::public.atendimento_plano,
      null,
      'nenhum'::public.nivel_escalonamento
    )
) as s(id, recomendacao_id, descricao, prazo, status, atendimento, justificativa_atendimento, escalonamento)
where exists (
  select 1 from public.recomendacoes r where r.id = '33333333-3333-4333-8333-333333333333'
)
and not exists (
  select 1 from public.planos_acao p where p.id = s.id
);
