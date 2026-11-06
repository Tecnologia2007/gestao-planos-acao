# Central de Auditorias — Cicobi Central Nordeste

Acompanhamento de auditorias e planos de ação da central. O ciclo na tela é constatação (critério, condição, causa e efeito) → recomendação → plano de ação → evidência → validação, com prazo, grau de atendimento e trilha do que mudou.

A interface, os textos e esta documentação estão em português do Brasil. O projeto é um único Next.js (App Router e TypeScript): telas e rotas de servidor no mesmo repositório, pronto para a Vercel. Os dados ficam no Supabase (Postgres e Auth). O e-mail de prazo sai pelo Resend.

Abre em qualquer editor que rode Node, inclusive o Google Antigravity: não há plugin, variável de IDE nem serviço local obrigatório além do Node.

## O que o sistema faz

- Lista, filtra e abre as auditorias visíveis para o usuário.
- Registra planos com responsável, prazo, situação e resposta à auditoria: atende integralmente, atende parcialmente ou não atende. Os dois últimos pedem justificativa.
- Guarda histórico numa trilha disparada pelo banco e um log de acessos.
- Mostra planos vencidos e os que vencem em 7 e em 15 dias. Um cron diário envia o e-mail correspondente ao Tony e ao responsável, uma vez por plano e por tipo de alerta.
- Exige login com segundo fator (TOTP). Sem o nível `aal2`, a área interna não abre.
- Separa administração, riscos e auditor externo. O auditor externo é somente leitura, só das auditorias atribuídas, só depois da aprovação, e o acesso pode expirar ou ser revogado.

## Estrutura

```
src/app                  telas e rotas (cron e saúde em src/app/api)
src/componentes          moldura, formulários, login e MFA
src/dominio              regras puras: prazos, acesso, cifra, texto do e-mail
src/servidor             sessão, ações e envio de e-mail
src/lib/supabase         cliente do navegador, do servidor e da service role
supabase/migrations      esquema, RLS e seed opcional
supabase/manual          SQL que você edita e roda na mão
docs/boas-praticas.md    de onde veio o desenho (IIA, ISO 19011, COSO)
tests                    alertas, regras de plano e conferência da RLS
```

A chave `service_role`, a chave de cifra, o segredo do cron e a chave do Resend só existem em módulo de servidor (`import "server-only"`). O navegador recebe a URL do Supabase e a chave anon, que é pública por desenho e continua limitada pela RLS.

## Rodar na sua máquina

Requisitos: Node.js 20 ou mais recente e npm. Nada de Docker.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sem o `.env.local`, `npm run dev` abre a página de configuração em vez de quebrar. Com as chaves do Supabase preenchidas, o endereço local é [http://localhost:3000](http://localhost:3000).

Comandos úteis:

```bash
npm test          # regras de alerta, criptografia e políticas de RLS
npm run lint
npm run typecheck
npm run build
```

## Criar um projeto novo no Supabase

O projeto atual não deve ser reutilizado. Esta aplicação pede um projeto vazio.

**Ação manual.** No [painel do Supabase](https://supabase.com/dashboard):

1. Se a organização não deixa criar outro projeto (limite do plano gratuito, em geral dois projetos ativos), crie uma organização nova no mesmo seletor de organização e crie o projeto dentro dela. Pausar ou apagar um projeto antigo também libera vaga. Não restaure este sistema em cima do banco cheio.
2. **New project**. Nome sugerido: `cicobi-auditorias`. Região: **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas. Espere o projeto ficar pronto.
3. Em **Project Settings → API**, copie:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (segredo; nunca no navegador e nunca no Git)

### Aplicar as migrations

**Ação manual.** No projeto novo, abra **SQL Editor** e execute, nesta ordem, o conteúdo inteiro de cada arquivo:

1. `supabase/migrations/20260306000001_esquema.sql`
2. `supabase/migrations/20260306000002_rls.sql`
3. `supabase/migrations/20260306000003_seed_opcional.sql` — opcional. Cria uma auditoria de exemplo com planos vencido, em 4 dias, em 12 dias e em 45 dias.

Quem preferir a CLI, com o [Supabase CLI](https://supabase.com/docs/guides/cli) autenticado:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

O `db push` também envia o seed. Se não quiser o exemplo, pule o terceiro arquivo no SQL Editor.

### Auth e MFA

**Ação manual**, ainda no projeto novo:

1. **Authentication → Sign In / Providers → Email**: deixe o e-mail habilitado. Desative o cadastro público (a opção de permitir que qualquer pessoa crie conta). Os convites feitos pela administração continuam valendo.
2. **Authentication → Multi-Factor**: habilite **TOTP**. A aplicação recusa o uso interno enquanto a sessão não estiver em `aal2`. Não há como “pular” o autenticador pela tela.
3. **Authentication → Users → Add user**: crie o Tony com e-mail e senha. Marque o e-mail como confirmado.
4. Volte ao **SQL Editor**, edite o e-mail em `supabase/manual/promover_admin.sql` e execute. A consulta do final do arquivo precisa devolver uma linha com `papel = admin` e `status_acesso = aprovado`.
5. Entre em `http://localhost:3000`, faça login e cadastre o aplicativo autenticador (QR Code). Só então o painel abre.

Se o usuário foi criado antes das migrations, o perfil não existe. Rode as migrations e crie o usuário de novo, ou rode o `update` depois que o trigger puder ter criado a linha. O trigger `on_auth_user_created` cria o perfil. Quem se cadastra sozinho, se o cadastro público vazar, nasce como riscos **pendente** e não vê dados até um administrador aprovar.

### Criptografia

O Supabase já cifra o disco do banco. Por cima disso, notas sigilosas da auditoria e da constatação são cifradas na aplicação com AES-256-GCM antes do `insert`. A chave fica em `ENCRYPTION_KEY` e não vai para o navegador.

**Ação manual:**

```bash
openssl rand -base64 32
```

Cole o resultado em `ENCRYPTION_KEY`. Use a mesma chave na Vercel. Perder a chave torna as notas ilegíveis; o restante do registro continua visível.

As funções `cifrar_pgcrypto` e `decifrar_pgcrypto` existem para uso no SQL Editor, com AES-256 via `pgcrypto`. O papel `authenticated` não pode executá-las. A tela não depende delas.

### Outros segredos locais

No `.env.local`:

- `ADMIN_EMAIL`: e-mail do Tony, sempre incluído nos alertas.
- `NEXT_PUBLIC_APP_URL`: `http://localhost:3000` na máquina. Na Vercel, a URL pública, sem barra no fim.
- `CRON_SECRET`: outro valor longo (`openssl rand -base64 32`), com pelo menos 16 caracteres.
- `SESSION_INACTIVITY_MINUTES`: padrão 30. A sessão cai depois desse tempo sem requisição.
- `RESEND_API_KEY` e `RESEND_FROM_EMAIL`: podem ficar vazios no primeiro login. Sem eles, o convite mostra a senha temporária uma vez na tela do administrador, e o cron registra o alerta como erro para tentar de novo no dia seguinte.

## Resend

**Ação manual:**

1. Crie uma conta em [resend.com](https://resend.com).
2. **Domains → Add domain**. O Resend mostra os registros DNS (SPF e DKIM; às vezes um registro de retorno).
3. Publique esses registros no provedor do domínio da central e espere a verificação. Enquanto o domínio não estiver verificado, o Resend só entrega para o e-mail da própria conta.
4. **API Keys → Create API key**. Cole em `RESEND_API_KEY`.
5. `RESEND_FROM_EMAIL` precisa usar o domínio verificado, por exemplo `Cicobi Auditorias <auditoria@seudominio.com.br>`.

O alerta diário manda o responsável em **Para** e os administradores em **cópia oculta**. O corpo leva código, prazo e um resumo do plano. Não leva condição, efeito nem nota sigilosa.

## Papéis, na prática

| Papel | Quem | O que faz |
| --- | --- | --- |
| `admin` | Tony | Tudo o que riscos faz, mais convite, aprovação, revogação, expiração, atribuição de auditoria, trilha e log de acessos |
| `risco` | Colaboradores da área | Cria e atualiza auditorias, constatações, planos, evidências e validações. Não governa usuário |
| `auditor` | Auditor externo | Somente leitura das auditorias atribuídas |

O auditor novo nasce **pendente**. Em **Usuários**, o administrador muda o acesso para **aprovado**, pode informar uma data de expiração e atribui cada auditoria. Revogar o acesso também revoga as atribuições. A RLS repete essas condições: a tela escondida não é a proteção.

Plano concluído ou cancelado não gera alerta. Mudou o prazo, o servidor apaga os alertas daquele plano e o ciclo de 15 dias, 7 dias e vencido começa de novo. Quem executa o plano não valida a própria entrega. Aceite sem evidência é recusado.

## Deploy na Vercel, neste repositório

**Ação manual.**

1. Envie esta branch para o GitHub (o pull request já aponta para o repositório).
2. Em [vercel.com/new](https://vercel.com/new), **Import** o repositório `gestao-planos-acao`. A Vercel detecta Next.js. Não é preciso mudar o comando de build (`next build`).
3. Antes do primeiro deploy, em **Environment Variables**, copie as chaves do `.env.example` com os valores do **projeto Supabase novo** (não do projeto antigo):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ENCRYPTION_KEY`
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `ADMIN_EMAIL`
   - `CRON_SECRET`
   - `SESSION_INACTIVITY_MINUTES`
   - `NEXT_PUBLIC_APP_URL` — pode começar com um valor provisório; depois do deploy, troque pela URL `https://….vercel.app` (ou pelo domínio próprio) e faça um novo deploy.
4. Deploy. O arquivo `vercel.json` registra o cron `0 11 * * *` (todo dia às 11:00 UTC, 8:00 em Fortaleza) em `/api/cron/alertas`.
5. Confirme em **Settings → Cron Jobs** que o job aparece. A Vercel chama a rota com `Authorization: Bearer <CRON_SECRET>` quando essa variável existe. A rota recusa chamada sem o segredo.
6. No plano Hobby o cron diário é o formato aceito. Se a conta não puder usar cron, use o modelo em `supabase/manual/pg_cron_opcional.sql` (extensões `pg_cron` e `pg_net` no projeto novo) **ou** o cron da Vercel, não os dois ao mesmo tempo — embora os dois juntos ainda não mandem o mesmo alerta duas vezes, por causa da chave única `(plano, tipo)`.
7. Abra a URL, entre com o Tony, conclua o MFA se ainda não concluiu, e convide a equipe em **Usuários**.

HTTPS fica por conta da Vercel. O `next.config.ts` envia HSTS, `nosniff`, `DENY` de frame, política de permissões e Content-Security-Policy. A sessão de inatividade é um cookie `httpOnly` renovado a cada requisição.

Para disparar o cron à mão, com o servidor no ar:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://SEU_APP.vercel.app/api/cron/alertas
```

A resposta traz quantos alertas foram enviados, ignorados ou ficaram em erro. O Resend recebe uma chave de idempotência `plano:tipo`, então uma nova tentativa não entrega a mesma mensagem de novo. `GET /api/saude` diz apenas se cada integração está presente, sem revelar segredo.

## Checklist do que só você pode fazer

- [ ] Criar o projeto Supabase novo (organização nova, se a atual não tiver vaga)
- [ ] Colar URL, anon e service role no `.env.local` e na Vercel
- [ ] Rodar as duas migrations obrigatórias e, se quiser, o seed
- [ ] Ligar e-mail, desligar cadastro público e habilitar TOTP
- [ ] Criar o usuário do Tony e promover com `supabase/manual/promover_admin.sql`
- [ ] Gerar `ENCRYPTION_KEY` e `CRON_SECRET`
- [ ] Verificar o domínio no Resend e criar a API key
- [ ] Importar este repositório na Vercel, apontando para o Supabase novo, e conferir o cron
- [ ] Ajustar `NEXT_PUBLIC_APP_URL` para a URL pública e entrar uma vez com o autenticador
