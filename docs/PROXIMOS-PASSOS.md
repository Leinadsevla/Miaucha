# Próximos passos

Atualizado em 20/11/2026. Passo 2 na branch `feat/api-auth` e passo 3 (parte sem Google) na `feat/mobile-auth-http`, criada a partir dela; as duas aguardam PR, nesta ordem. A S2 (ocorrências) está na `feat/ocorrencias`, criada a partir da `feat/pets` (ver a seção "S2 · Ocorrências"). A S5 (alertas) e a aba Perfil completa estão na `feat/alertas`, criada a partir da `feat/ocorrencias` (ver "S5 · Alertas de proximidade").

## Onde estamos

Sprint 1 (Fundação), parte do app pronta:

| Item da S1 | Situação |
| --- | --- |
| Monorepo (`apps/mobile`, `apps/api`, `packages/shared`) | Pronto |
| Design system (tokens, Nunito, componentes base) | Pronto |
| Telas de splash, login/cadastro, código de e-mail, consentimento, política | Prontas, com login **falso** (`createMockAuthClient`) |
| Abas (Início, Mapa, Alertas, Chat, Perfil) | Início (S2), Alertas (S5) e Perfil prontos; Mapa e Chat nas S3 e S4 |
| Docker Compose (PostGIS + Redis) | Falta |
| CI no GitHub Actions | Falta |
| Login real (API + Google) | E-mail e senha prontos de ponta a ponta; Google falta no app (precisa dos client IDs e do development build) |
| Cadastro de pet com fotos (NF-05) | Pronto no código (`feat/pets`); falta criar o bucket e as chaves no Supabase |
| Development build do Expo (EAS) | Falta |

Testes: 639 passando (113 no shared, 324 no app, 202 na API) na `feat/alertas`. Os de integração da API precisam do Docker rodando. Ainda não houve teste num aparelho real.

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

E-mail e senha feitos: o app usa a API quando `EXPO_PUBLIC_API_URL` está definida (ver `apps/mobile/.env.example`); sem ela, em desenvolvimento, continua com o login falso. Um build de produção sem a URL quebra na abertura em vez de cair no login falso. O cliente foi testado contra a API real (cadastro, código, consentimento, refresh, logout).


- [x] `HttpAuthClient` implementando `AuthClient`; trocar o `createMockAuthClient` em `apps/mobile/src/app/_layout.tsx`. As mensagens de erro da API (`body.message`, e `body.errors` por campo no 400) já estão em português para mostrar direto na tela.
- [x] Tokens em `expo-secure-store`; `restore()` lê a sessão salva (sem rede, abre com o usuário salvo).
- [x] Serializar o `/auth/refresh` (uma chamada por vez, as outras esperam a mesma promessa): a API trata o reuso de um refresh token como roubo e derruba todas as sessões.
- [ ] Google com `@react-native-google-signin/google-signin` (precisa de development build e dos client IDs do Google Cloud). O app já aceita isso: basta passar um `GoogleSignIn` (`{ getIdToken() }`) para `createHttpAuthClient` em `createAuthClient.ts`. Hoje o botão mostra "O login com Google ainda não está disponível nesta versão do app". Na API, preencher `GOOGLE_CLIENT_IDS`.
- [ ] Development build com EAS (`eas build --profile development`), que também é necessário para o geofencing da S5. Precisa de uma conta Expo do grupo.
- [ ] Para testar no aparelho com a API local em `http://`: o Expo Go aceita; num build de produção o Android bloqueia HTTP sem TLS, então a API publicada precisa de HTTPS.

### 4. Cadastro de pet com fotos (`feat/pets`)

Feito no código (API e app), testado contra Postgres e storage S3 reais. Fluxo: `POST /pets` → `POST /pets/:id/photos` devolve URL assinada de PUT (5 min) → o app envia a foto direto ao storage → `POST /pets/:id/photos/:photoId/confirm` confere tamanho (até 10 MB) e tipo → `GET /me/pets` devolve as fotos com URL assinada de 1 h. Uma foto que falha não desfaz o cadastro do pet.

- [ ] **Configurar o Supabase Storage:** criar o bucket `pet-photos` **privado** e gerar as chaves S3 (Storage → Settings → S3 Connection). Preencher `STORAGE_ACCESS_KEY_ID` e `STORAGE_SECRET_ACCESS_KEY` em `apps/api/.env` e conferir endpoint e região. Sem isso a API não sobe.
- [ ] Rodar `pnpm dev` na API para aplicar a migração `003_pets.sql` no Supabase.
- [ ] Testar num aparelho (Expo Go): escolher fotos na galeria e cadastrar.
- [ ] Pedidos de upload nunca confirmados deixam linhas em `pet_photos` (e às vezes arquivos órfãos). Um job de limpeza pode entrar junto com o job de expiração da S2.
- [ ] Editar e apagar pet e fotos ainda não existem (a exclusão de conta da S6, NF-01, precisa apagar as fotos do storage).

<details><summary>Especificação original</summary>


- [ ] API: `POST /pets`, `GET /me/pets`, upload com URL assinada para storage S3-compatível (NF-05; teste garantindo que não existe URL pública).
- [ ] App: tela `pets/new` (fotos com `expo-image-picker`) e "Meus Pets" no Perfil, seguindo o design.

</details>

Depois disso a S1 fecha e começa a S2 (ocorrências e `local_publico` com deslocamento de ~150 m).

## S2 · Ocorrências (`feat/ocorrencias`)

Feito em TDD (API contra PostGIS e storage reais via Testcontainers; app com RNTL). Branch criada a partir da `feat/pets`.

**Regras puras (`packages/shared`):** `publicPoint` (desloca o ponto real numa direção aleatória, entre 75 e 190 m, dentro da faixa 50–200 m do MP-07 com folga para a diferença esfera × elipsoide do PostGIS), `distanceMeters` (haversine), `validateOccurrence` (nome obrigatório só para "perdido"), `occurrenceExpiryCutoff`/`isOccurrenceExpired` (NF-03, 30 dias sem atualização). `PublicOccurrence` ganhou `status`, `isMine` e `distanceMeters?`.

**API:** migração `004_occurrences.sql` (`occurrences` e `occurrence_photos`, com RLS). `location` guarda o ponto exato e nunca sai da API; `public_location` é gerada uma vez na criação (sortear a cada leitura permitiria achar o ponto real pela média). Índices GiST em `public_location` (raio, com `ST_DWithin`) e em `(public_location::geometry)` (bbox exato em lat/lng).

| Rota | Resposta |
| --- | --- |
| `POST /occurrences` | 201 + `PublicOccurrence`. Com `petId` (pet do autor, senão 404), os dados do pet completam o que faltar e as fotos dele entram na ocorrência (mesmo objeto no storage) |
| `GET /occurrences?lat=&lng=&radiusKm=` | Até 200 abertas e não expiradas, mais recentes primeiro, com `distanceMeters`. Raio padrão 5 km, máximo 20 km |
| `GET /occurrences?bbox=minLng,minLat,maxLng,maxLat` | Igual, sem `distanceMeters` (MP-02) |
| Filtros nas duas buscas | `type`, `species`, `sinceDays` (1 a 365, pela data de criação) |
| `GET /occurrences/:id` | Detalhe público para qualquer usuário logado (inclusive resolvida) |
| `GET /me/occurrences` | As do usuário, inclusive resolvidas e expiradas |
| `POST /occurrences/:id/resolve` | Só o autor (404 para os outros); idempotente |
| `POST /occurrences/:id/photos` e `.../photos/:photoId/confirm` | Mesmo fluxo e validações das fotos de pet (agora em `storage/photo-uploads.ts`, usado pelos dois) |

Nas buscas, `photoUrls` traz só a foto de capa (para não assinar centenas de URLs); no detalhe e em `/me/occurrences`, todas. Criação, fotos e resolução têm rate limit (NF-04); leituras não.

**App:** `OccurrencesClient` (HTTP e memória; o falso cria exemplos perto do usuário na primeira busca), localização com `expo-location` só em primeiro plano (`features/location`), aba Início (raio de 5 km, puxar para atualizar, estados de carregando/vazio/erro/sem permissão), tela `occurrences/new` (com `?petId=`), tela `occurrences/[id]` ("Como chegar" abre Google Maps, Waze ou Apple Maps no ponto **público**; "Conversar" desabilitado com "Chat em breve") e o botão "Registrar como perdido" no detalhe do pet.

Pendências:

- [ ] **Job diário de expiração (NF-03):** hoje a regra é aplicada na consulta (`updated_at > now() - 30 dias`), então a ocorrência some das buscas no prazo certo sem job. Um job (BullMQ, junto com os da S5) pode marcar `status = 'expired'` e avisar o autor, e limpar os pedidos de upload nunca confirmados.
- [ ] Nada atualiza `updated_at` além de "resolver": falta uma ação "ainda procurando" (renova os 30 dias) e editar a ocorrência.
- [ ] Ajustar o pin no mapa ao registrar (hoje usa a localização atual do aparelho + endereço digitado). Fica para a S3, com o mapa.
- [ ] Teste de carga do MP-02 com k6. Há um teste de integração com 5 mil ocorrências que exige resposta abaixo de 300 ms no raio e no bbox, mas roda local, sem rede.
- [ ] Apagar uma foto de pet precisa conferir se o objeto não é usado por uma ocorrência (`occurrence_photos.object_key` pode apontar para a foto do pet). Relevante para a exclusão de conta (NF-01).
- [ ] Rodar `pnpm dev` na API para aplicar a migração `004_occurrences.sql` no Supabase.
- [ ] Testar no aparelho: permissão de localização, puxar para atualizar e "Como chegar". O `expo-location` em primeiro plano funciona no Expo Go.

## S5 · Alertas de proximidade (`feat/alertas`)

Feito em TDD (API contra PostGIS real via Testcontainers; app com RNTL). Branch criada a partir da `feat/ocorrencias`. Migração `007_alerts.sql` (a 006 fica para o chat).

**Regras puras (`packages/shared`):** `encodeGeohash`/`decodeGeohash`/`geohashNeighbors` (valores de referência e conferido contra o `st_geohash` do PostGIS), `ALERT_GEOHASH_PRECISION = 6`, preferências (`validateAlertPreferences`, raios 1/3/5 km), `isInQuietHours` (fuso de São Paulo, silêncio pode atravessar a meia-noite, fim não incluso), `isValidPushToken`, `pickGeofenceRegions`/`shouldRecalculateGeofences` (AL-03: iOS 20, Android 100) e `formatApproxDistance`.

**API:**

| Rota | Formato |
| --- | --- |
| `PUT /me/location` | Corpo **só** `{ geohash }` com 6 caracteres → 204. Coordenada, outra precisão ou campo extra → 400 (AL-06) |
| `GET /me/alert-preferences` | `{ enabled, radiusKm: 1\|3\|5, quietHours: { start: "HH:MM", end: "HH:MM" } \| null }`; sem linha = `{ true, 3, null }` |
| `PUT /me/alert-preferences` | Mesmo formato → 200 com o salvo; inválido → 400 com `errors` por campo |
| `POST /me/push-token` / `DELETE /me/push-token` | `{ token: "ExponentPushToken[...]" }` → 204. O token passa a ser só da conta que registrou por último |
| `GET /me/alerts` | Até 100 `AlertItem`, mais recentes primeiro: `{ id, occurrenceId, distanceMeters, createdAt, seenAt, occurrence: { type, species, petName, breed, color, approxAddress, status, createdAt, photoUrl } }`. Sem coordenada, sem pseudônimo, sem e-mail |
| `POST /me/alerts/:id/seen` | 204; de outra pessoa → 404 |
| `GET /me` | `{ id, name, pseudonym, petCount, occurrenceCount }` (sem e-mail) |

Tabelas: `user_locations` (uma linha por usuário: `geohash` e `updated_at`, nada mais), `alert_preferences` (silêncio em minutos), `push_tokens`, `alerts` (`unique (user_id, occurrence_id)`, AL-05). Todas com RLS.

**Disparo (AL-01, AL-07):** o `POST /occurrences` enfileira e responde na hora (`InProcessAlertQueue`, atrás da interface `AlertQueue`, token `ALERT_QUEUE`). O job pega o ponto **público** da ocorrência, pré-filtra pela célula de precisão 4 dela e as 8 vizinhas (índice em `left(geohash, 4)`) e confirma no PostGIS se alguma parte da célula do usuário (`st_geomfromgeohash`) está a até o raio dele. Fica de fora: o autor, quem desligou os alertas e quem não atualiza a região há mais de 30 dias. `distanceMeters` é do centro da célula até o ponto público (aproximado por natureza). Quem está no horário de silêncio **recebe o alerta na lista, mas sem push** (decisão: o silêncio cala o celular, não esconde o caso). O push vai pela interface `PushSender`; a real (`ExpoPushSender`) chama `https://exp.host/--/api/v2/push/send` em lotes de 100 e apaga tokens com `DeviceNotRegistered`. `EXPO_ACCESS_TOKEN` é opcional.

**App:**

- `features/alerts`: `AlertsClient` (HTTP e memória), `createLocationSync` (calcula o geohash no aparelho e só envia ao mudar de célula; roda ao abrir, ao voltar para o primeiro plano e a cada 5 min com o app aberto, sem nunca abrir o diálogo de permissão: usa `getLocationIfAllowed`), `registerForPush`/`pushAvailability`, `notificationTarget` (AL-08), `AlertsProvider` (liga tudo quando há sessão com consentimento) e `runtime.ts` (as APIs reais do Expo).
- Aba **Alertas**: lista com tipo, espécie, nome, distância aproximada e tempo; marca "Novo"; filtros por distância; tocar marca como visto e abre `/occurrences/[id]`; carregando/vazio/erro; puxar para atualizar. Funciona sem push.
- Tela `/alert-preferences`: ligar/desligar, raio, silêncio (HH:MM), explicação da localização aproximada, estado das notificações e o geofencing.
- Tocar na notificação (inclusive com o app fechado) abre o detalhe da ocorrência e marca o alerta como visto.

**O que funciona no Expo Go:** aba Alertas, preferências, atualização da região e o disparo pelo servidor. **Não funciona no Expo Go:** push no Android (removido do Expo Go no SDK 53; o app detecta e explica, sem carregar o `expo-notifications`) e o geofencing. Push também exige `extra.eas.projectId` no `app.json` (sem ele o app mostra "falta o projeto no EAS").

Pendências:

- [ ] **Development build com EAS** (`eas init` grava o `projectId`; `eas build --profile development`) para testar o push no Android e o toque na notificação (AL-08, teste manual da matriz).
- [ ] **Trocar a fila em processo por BullMQ + Redis** quando houver mais de uma instância da API ou se perder disparos num reinício for inaceitável: criar uma classe que implemente `AlertQueue` (`occurrenceCreated` adiciona um job; um worker chama `AlertsService.dispatchForOccurrence`) e registrá-la no token `ALERT_QUEUE` em `app.module.ts`. O disparo já é idempotente (AL-05), então reprocessar um job é seguro.
- [ ] Ler os recibos do Expo Push (`/push/getReceipts`) num job agendado, para apagar tokens inválidos que só aparecem depois.
- [ ] **Geofencing (AL-02, AL-03):** a lógica está testada (`features/alerts/geofencing.ts`) e a parte nativa pronta em `geofencingNative.ts` (tarefa do `expo-task-manager`, notificação local, sem repetir), mas desligada. Para ligar: no `app.json`, no plugin do `expo-location`, trocar `locationAlwaysAndWhenInUsePermission` por um texto, `isAndroidBackgroundLocationEnabled: true` e `isIosBackgroundLocationEnabled: true`; development build; `EXPO_PUBLIC_GEOFENCING=1`. A permissão "sempre" só é pedida pelo botão da tela de preferências, depois da explicação. No Expo Go o módulo nem é carregado. Teste de campo na matriz.
- [ ] O fuso do silêncio é sempre São Paulo; usuários em outros fusos do Brasil ficam com 1 a 2 h de diferença.
- [ ] Rodar `pnpm dev` na API para aplicar a `007_alerts.sql` no Supabase.

## Perfil (`feat/alertas`)

Aba Perfil seguindo o `ProfileScreen` do protótipo: nome, **nome público** (pseudônimo), contadores de pets e ocorrências (`GET /me`), card Meus Pets, **Minhas ocorrências** (`GET /me/occurrences`, abre o detalhe; mostra "Resolvida"), e configurações: Notificações e Localização (→ preferências de alerta), Política de privacidade (`/privacy`), Ajuda (`/help`, perguntas frequentes) e Sair (remove o token de push do aparelho antes de sair). Sem e-mail na tela: a API não devolve e-mail nem para o próprio usuário.

- [ ] Exclusão de conta (NF-01, S6) entra na lista de configurações quando existir.
- [ ] Foto de perfil (o protótipo tem): fora do MVP por enquanto.

## Banco no Supabase (`chore/supabase-db`)

O grupo criou o projeto `ermdracdakmacpwsalfu` no Supabase para o Postgres. Os testes continuam usando Testcontainers (nunca tocam no Supabase).

- [x] Migração `002_row_level_security.sql`: RLS em todas as tabelas, para a Data API do Supabase não expor `users` (e-mail, hash de senha) à chave `anon`.
- [x] `apps/api/.env` com a URL do **Session pooler** (`aws-0-us-west-2.pooler.supabase.com`; a conexão direta é só IPv6). O certificado (CA pública do Supabase) está commitado em `apps/api/certs/supabase-ca.crt`. Conexão confirmada com TLS 1.3 e certificado verificado.
- [x] Migrações 001 e 002 aplicadas no Supabase em 20/11/2026; as quatro tabelas estão com RLS. Cadastro, código e login testados contra o Supabase (usuário de teste apagado depois).
- [ ] A tabela `spatial_ref_sys` do PostGIS fica no `public` sem RLS (é do superusuário do Supabase, não dá para alterar). São dados públicos de referência, mas o Security Advisor do painel vai apontar; desligar a Data API resolve.
- [ ] Se ninguém for usar o `supabase-js`, desligar a Data API em Project Settings → Data API (segunda camada de proteção).

## Decisões em aberto

| Decisão | Quem | Impacto |
| --- | --- | --- |
| Prazo final e tamanho do time | Grupo | Pode encolher as sprints |
| Cidade de lançamento | Grupo | Seed de dados e teste de campo |
| Provedor de e-mail para o código (Resend, SMTP gratuito...) | Backend | Antes de testar com usuários reais (a API já tem a interface `Mailer`) |
| ~~Storage das fotos~~ Decidido: Supabase Storage pelo protocolo S3 (trocar para R2 é só mudar as variáveis `STORAGE_*`) | Backend | — |
| Hospedagem da API (Railway ou Render) | Full stack | Antes da S6 |
| Conta Google Cloud para os client IDs | Quem cuidar do login | Necessário no passo 3 |

## Para começar uma sessão nova com o Claude

> Leia `CLAUDE.md` e `docs/PROXIMOS-PASSOS.md`. Vamos fazer o passo N em TDD, numa branch nova.
