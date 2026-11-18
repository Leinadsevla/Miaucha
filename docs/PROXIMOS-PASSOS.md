# Próximos passos

Atualizado em 18/11/2026, na branch `feat/api-auth` (passo 2 feito, aguardando PR).

## Onde estamos

Sprint 1 (Fundação), parte do app pronta:

| Item da S1 | Situação |
| --- | --- |
| Monorepo (`apps/mobile`, `apps/api`, `packages/shared`) | Pronto |
| Design system (tokens, Nunito, componentes base) | Pronto |
| Telas de splash, login/cadastro, código de e-mail, consentimento, política | Prontas, com login **falso** (`createMockAuthClient`) |
| Abas (Início, Mapa, Alertas, Chat, Perfil) | Estrutura pronta; conteúdo nas S3 a S5 |
| Docker Compose (PostGIS + Redis) | Falta |
| CI no GitHub Actions | Falta |
| Login real (API + Google) | API pronta (`feat/api-auth`); falta ligar o app (passo 3) |
| Cadastro de pet com fotos (NF-05) | Falta |
| Development build do Expo (EAS) | Falta |

Testes: 161 passando (32 no shared, 63 no app, 66 na API). Os de integração da API precisam do Docker rodando. Ainda não houve teste num aparelho real.

## Ordem sugerida

### 0. Arrumação (antes de qualquer código)

- [ ] Criar a branch `main` no GitHub a partir de `s1/fundacao`, torná-la padrão e exigir PR com 1 revisão.
- [ ] Mover o repositório para fora do OneDrive (ex.: `C:\dev\miaucha`).
- [ ] Adicionar `.gitattributes` com `* text=auto eol=lf` para evitar diferenças de fim de linha entre Windows e Mac/Linux.
- [ ] Instalar o Docker Desktop (necessário para o banco local e para os testes de integração).

### 1. Infra local e CI (`chore/infra`)

- [ ] `docker-compose.yml` na raiz com `postgis/postgis` e `redis`, mais `.env.example`.
- [ ] `.github/workflows/ci.yml`: `pnpm install`, `pnpm typecheck`, `pnpm test` em todo PR.

### 2. API de autenticação (`feat/api-auth`), em TDD ✅

Feito. Resumo do que ficou decidido e do que falta:

- **Banco:** `pg` + migrações SQL em `apps/api/migrations` (sem ORM), aplicadas no boot e nos testes. PostGIS já ativado.
- **Sessão:** access token JWT de 15 min; refresh token opaco (só o hash vai para o banco), rotacionado a cada `/auth/refresh`. Reusar um refresh já trocado derruba todas as sessões do usuário.
- **Rotas extras:** `POST /auth/logout` (revoga o refresh token; o `AuthClient` do app já tinha `logout`).
- **Respostas:** `{ accessToken, refreshToken, user: { id, name, pseudonym, hasConsent } }`. Nunca e-mail nem hash.
- **Reenvio de código:** um por minuto por e-mail (429). E-mail desconhecido ou já verificado responde 204 sem enviar nada.
- **Google:** liga à conta com o mesmo e-mail. Se esse cadastro ainda não estava verificado, a senha e o nome dele são descartados (evita sequestro de conta por pré-cadastro).
- **Pendências:**
  - [ ] Provedor de e-mail real: hoje o `ConsoleMailer` só escreve o código no log. Basta implementar a interface `Mailer` (`apps/api/src/mail/mailer.ts`).
  - [ ] Em produção atrás de proxy (Railway/Render), configurar `trust proxy` no Express para o rate limit enxergar o IP real.
  - [ ] Rate limit em memória: com mais de uma instância da API, trocar o storage do throttler por Redis.

<details><summary>Especificação original</summary>


Criar `apps/api` (NestJS). Testes de integração com Jest + Supertest + Testcontainers (Postgres real).

Tabelas:

- `users`: `id`, `name`, `pseudonym` (gerado, ex.: "Tutor Laranja 42"), `email` (único), `password_hash` (nulo para conta Google), `google_sub`, `email_verified_at`, `consent_at`, `created_at`.
- `email_codes`: `email`, `code_hash`, `expires_at` (10 min), `attempts`.

Rotas (o contrato já existe no app: interface `AuthClient` em `apps/mobile/src/features/auth/AuthProvider.tsx`):

| Rota | Comportamento esperado (vira teste) |
| --- | --- |
| `POST /auth/signup` | Cria usuário não verificado e envia código; e-mail repetido → 409 |
| `POST /auth/verify-email` | Código certo → tokens; errado → 400; expirado ou 5 tentativas → 410 |
| `POST /auth/resend-code` | Novo código; limite de envios |
| `POST /auth/login` | Senha certa → tokens; errada → 401 com "E-mail ou senha incorretos"; não verificado → 403 |
| `POST /auth/google` | Valida o ID token (`google-auth-library`, mockado no teste) e cria ou entra na conta |
| `POST /auth/refresh` | Troca o refresh token |
| `POST /me/consent` | Grava `consent_at` |

Regras: senha com argon2; validação reaproveitando `validateSignUp`/`validateLogin` do `packages/shared`; rate limit com `@nestjs/throttler` (NF-04, teste esperando 429); nenhuma resposta devolve `password_hash`. Atualizar NF-02 na matriz quando os testes passarem.

</details>

### 3. Login real no app (`feat/mobile-auth-http`)

- [ ] `HttpAuthClient` implementando `AuthClient`; trocar o `createMockAuthClient` em `apps/mobile/src/app/_layout.tsx`. As mensagens de erro da API (`body.message`, e `body.errors` por campo no 400) já estão em português para mostrar direto na tela.
- [ ] Tokens em `expo-secure-store`; `restore()` lê a sessão salva.
- [ ] Serializar o `/auth/refresh` (uma chamada por vez, as outras esperam a mesma promessa): a API trata o reuso de um refresh token como roubo e derruba todas as sessões.
- [ ] Google com `@react-native-google-signin/google-signin` (precisa de development build e dos client IDs do Google Cloud).
- [ ] Development build com EAS (`eas build --profile development`), que também é necessário para o geofencing da S5.

### 4. Cadastro de pet com fotos (`feat/pets`)

- [ ] API: `POST /pets`, `GET /me/pets`, upload com URL assinada para storage S3-compatível (NF-05; teste garantindo que não existe URL pública).
- [ ] App: tela `pets/new` (fotos com `expo-image-picker`) e "Meus Pets" no Perfil, seguindo o design.

Depois disso a S1 fecha e começa a S2 (ocorrências e `local_publico` com deslocamento de ~150 m).

## Decisões em aberto

| Decisão | Quem | Impacto |
| --- | --- | --- |
| Prazo final e tamanho do time | Grupo | Pode encolher as sprints |
| Cidade de lançamento | Grupo | Seed de dados e teste de campo |
| Provedor de e-mail para o código (Resend, SMTP gratuito...) | Backend | Antes de testar com usuários reais (a API já tem a interface `Mailer`) |
| Storage das fotos (Cloudflare R2 ou Supabase Storage) | Backend | Necessário no passo 4 |
| Hospedagem da API (Railway ou Render) | Full stack | Antes da S6 |
| Conta Google Cloud para os client IDs | Quem cuidar do login | Necessário no passo 3 |

## Para começar uma sessão nova com o Claude

> Leia `CLAUDE.md` e `docs/PROXIMOS-PASSOS.md`. Vamos fazer o passo N em TDD, numa branch nova.
