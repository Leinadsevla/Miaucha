# Próximos passos

Atualizado em 22/11/2026. Os passos 2 a 4 e as sprints S2 a S5 estão em branches empilhadas, cada uma com PR aberto e criada a partir da anterior: `feat/api-auth` → `feat/mobile-auth-http` → `chore/supabase-db` → `feat/pets` → `feat/ajustes-conta-pets` → `feat/ocorrencias` → `feat/mapa` → `feat/alertas` → `feat/chat`. Mergear nessa ordem.

## Onde estamos

Sprint 1 (Fundação), parte do app pronta:

| Item da S1 | Situação |
| --- | --- |
| Monorepo (`apps/mobile`, `apps/api`, `packages/shared`) | Pronto |
| Design system (tokens, Plus Jakarta Sans, componentes base) | Pronto |
| Telas de splash, login/cadastro, código de e-mail, consentimento, política | Prontas, com login **falso** (`createMockAuthClient`) |
| Abas (Início, Mapa, Alertas, Chat, Perfil) | Todas prontas: Início (S2), Mapa (S3), Chat (S4), Alertas (S5) e Perfil |
| Docker Compose (PostGIS + Redis) | Falta |
| CI no GitHub Actions | Falta |
| Login real (API + Google) | E-mail e senha prontos de ponta a ponta; Google falta no app (precisa dos client IDs e do development build) |
| Cadastro de pet com fotos (NF-05) | Pronto no código (`feat/pets`); falta criar o bucket e as chaves no Supabase |
| Development build do Expo (EAS) | Falta |

Testes: 941 passando (198 no shared, 496 no app, 247 na API), na `feat/ajustes-teste-2`. Os de integração da API precisam do Docker rodando.

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
  - [x] Provedor de e-mail: `GmailApiMailer` (API do Gmail por HTTPS, conta Gmail do projeto, sem domínio) quando as variáveis `GMAIL_*` existem; senão `ResendMailer` com `RESEND_API_KEY`; senão o `ConsoleMailer` escreve o código no log.
- [ ] Criar o projeto no Google Cloud, gerar as credenciais e o refresh token (`pnpm gmail:authorize`) e configurar no Render. Ver `docs/DEPLOY-RENDER.md`.
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
| `GET /occurrences?lat=&lng=&radiusKm=` | Até 200 abertas e não expiradas, mais recentes primeiro, com `distanceMeters`. Raio padrão 5 km, máximo 30 km (o app oferece 1, 3, 5, 10, 20 e 30 km) |
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
- [x] Ajustar o pin no mapa ao registrar (`PinPicker` ligado no `OccurrenceForm`).
- [ ] Teste de carga do MP-02 com k6. Há um teste de integração com 5 mil ocorrências que exige resposta abaixo de 300 ms no raio e no bbox, mas roda local, sem rede.
- [ ] Apagar uma foto de pet precisa conferir se o objeto não é usado por uma ocorrência (`occurrence_photos.object_key` pode apontar para a foto do pet). Relevante para a exclusão de conta (NF-01).
- [ ] Rodar `pnpm dev` na API para aplicar a migração `004_occurrences.sql` no Supabase.
- [ ] Testar no aparelho: permissão de localização, puxar para atualizar e "Como chegar". O `expo-location` em primeiro plano funciona no Expo Go.

## S3 · Mapa interativo (`feat/mapa`)

Feito em TDD, criado a partir da `feat/ocorrencias`. Só o app mudou (a API da S2 já tinha a busca por bbox com filtros); nenhuma migração.

**Dependências:** o mapa era `react-native-maps`; em `feat/eas-build` virou MapLibre (`@maplibre/maplibre-react-native` 11, mapas gratuitos do OpenFreeMap, sem chave do Google). `supercluster` 9 (JS puro, traz os próprios tipos). Os dois são ESM e entraram no `transformIgnorePatterns` do Jest (com o `kdbush`). No Jest o mapa é um mock (`src/test-utils/maplibreMock.tsx`, ligado no `jest.setup.ts`).

**Regras puras (`apps/mobile/src/features/map`):**

| Arquivo | O que faz |
| --- | --- |
| `region.ts` | Região → bbox (com folga de 25% em cada lado), `shouldRefetch` (só busca de novo se a área visível sai do que já foi carregado ou, ao aproximar, se o último resultado veio cortado no limite de 200), zoom para o supercluster, região padrão (centro de São Paulo) |
| `clusters.ts` | MP-03: índice do supercluster pelo `publicLocation`; `expansionRegion` dá o zoom em que um grupo se separa |
| `filters.ts` | MP-05: tipo (um ou todos), espécie (um ou todos) e período (24 h, 7 dias, 30 dias; padrão 30 dias, que equivale a tudo por causa da expiração NF-03). A API só aceita um tipo por busca |
| `mapCache.ts` | MP-08: último mapa (região + ocorrências) num arquivo JSON em `Paths.document` (`expo-file-system`). Nunca lança; conteúdo estragado vira "sem cache" |
| `mapLoader.ts` | MP-02: debounce de 400 ms, descarta resposta antiga, salva no cache e, num erro de rede (`ApiError` com status 0), mostra o cache com os filtros atuais aplicados |

**Telas e componentes:** `MapScreen` (aba Mapa: contagem da área, botão de filtros com o número de ativos, legenda das cores, botão "Minha localização", avisos de sem conexão, de erro e de localização negada), `OccurrencePin`/`ClusterBubble` e os `Marker` (MP-01: cor = tipo, ícone = espécie), `OccurrenceCard` (MP-04, com "Ver detalhes" e "Como chegar", MP-06), `MapFiltersSheet` (MP-05, `Modal` que sobe de baixo; só aplica ao tocar em "Aplicar filtros") e `PinPicker` (mapa pequeno com marcador arrastável). `OccurrencesClient` ganhou `inArea({ bbox, type, species, sinceDays })`.

Sem permissão de localização, o mapa abre no último mapa salvo ou no centro de São Paulo, com um aviso e o botão "Permitir localização" (ou "Abrir configurações", se bloqueado). Ao voltar para a aba, busca a mesma área de novo.

Pendências:

- [x] `PinPicker` ligado no `OccurrenceForm`: começa na localização atual ou no endereço encontrado; procurar outro endereço recoloca o pino.
- [x] Atalho "Ver no mapa" na aba Início.
- [x] **Mapa sem chave do Google:** trocado para MapLibre + OpenFreeMap (`features/map/MapCanvas.tsx`). Exige development build: não roda no Expo Go.
- [ ] Testar no aparelho: arrastar e dar zoom (debounce, clusters se separando), marcadores customizados no Android e no iOS (`Marker` do MapLibre), tocar num marcador não pode fechar o card logo em seguida (o toque não pode chegar também ao mapa), "Como chegar" pelo card, modo avião (MP-08) e o `PinPicker` arrastando o marcador.
- [ ] Apagar o cache do mapa ao sair da conta (`mapCache.clear()` existe; não foi ligado ao logout para não mexer no `AuthProvider`). Só guarda dados públicos.
- [ ] Fotos no modo offline: as URLs são assinadas e expiram em 1 h; sem internet, o card mostra a foto só se o `expo-image` já a tiver em cache.
- [ ] Teste de carga do MP-02 com k6 (continua pendente da S2).

## S4 · Chat interno (`feat/chat`)

Feito em TDD, a partir da `feat/ocorrencias`. API testada contra PostGIS, storage S3 e Redis reais (Testcontainers) e com `socket.io-client`; app com RNTL.

**Regras puras (`packages/shared/src/chat.ts`):** `maskContactInfo` (CH-06: telefones brasileiros em vários formatos, e-mails, inclusive "arroba ... ponto com", links com e sem `http`, `www.`, `wa.me` e domínios simples; não mascara horários, valores com `R$`, datas, CEP nem microchip), `validateChatText` (até 2000 caracteres), `chatPushPreview`, motivos de denúncia e os tipos `ChatConversation`/`ChatMessage`.

**API:** migração `006_chat.sql` (`conversations`, `chat_messages`, `chat_photos`, `chat_blocks`, `chat_reports`, todas com RLS). A conversa guarda o autor da ocorrência e quem puxou conversa; o par + ocorrência é único (iniciar é idempotente). Mensagens ordenadas por `seq` (identity) para o cursor ser estável. O texto já entra mascarado e a localização já entra aproximada: nem o telefone digitado nem o ponto exato chegam ao banco.

| Rota | Resposta |
| --- | --- |
| `POST /conversations` `{ occurrenceId }` | 200 + `ChatConversation`. 400 para o próprio autor; 409 se a ocorrência foi resolvida ou expirou (a conversa que já existia continua); 403 com bloqueio entre os dois |
| `GET /conversations` | As do usuário, da atividade mais recente para a mais antiga, com última mensagem e não lidas |
| `GET /conversations/:id` | Uma conversa (404 para quem não participa, em todas as rotas abaixo) |
| `GET /conversations/:id/messages?before=<id>&limit=` | `{ messages, nextCursor }`, mais novas primeiro, 30 por página |
| `POST /conversations/:id/messages` | `{ text }`, `{ photoId }` (foto já confirmada, uma mensagem por foto) ou `{ location: { lat, lng } }` → 201 + `ChatMessage`. 403 com bloqueio |
| `POST /conversations/:id/read` | 204; marca como lidas as recebidas |
| `POST /conversations/:id/photos` e `.../photos/:photoId/confirm` | Mesmo fluxo e validações das fotos de pet (`PhotoUploads`, agora aceitando mais de uma coluna de dono) |
| `POST`/`DELETE /conversations/:id/contact-consent` | Aceitar/desistir de trocar contato (CH-07). `contact.otherEmail` só vem quando os dois aceitaram e não há bloqueio (decidido no SQL) |
| `POST`/`DELETE /conversations/:id/block` | Bloqueio vale para o par: nenhum dos dois envia, e não se abre conversa nova entre eles |
| `POST /conversations/:id/report` `{ reason, details? }` | 204; grava em `chat_reports` com status `pending` |

`ChatConversation` traz `otherPseudonym`, `iAmAuthor`, dados públicos do pet, `lastMessage`, `unreadCount`, `blockedByMe`, `canSend` e `contact { mine, theirs, otherEmail }`. `ChatMessage` traz `mine` (calculado para quem recebe), nunca o id de quem enviou.

**Socket.IO (CH-03):** namespace `/chat`, handshake com `auth: { token: <access token> }` (recusado com `connect_error` "unauthorized"); a conexão cai quando o token expira e o app reconecta com o token renovado. O app só recebe eventos; tudo o que ele envia vai por HTTP (uma validação, um rate limit e o refresh do `ApiSession`). Eventos, enviados para a sala de cada participante já na visão dele:

- `message:new` `{ conversationId, message }` (também para os outros aparelhos de quem enviou, com `mine: true`)
- `message:read` `{ conversationId, readAt }` (para quem enviou)
- `conversation:updated` `{ conversation }` (contato e bloqueio)

**Redis:** só é preciso com mais de uma instância da API. Com `REDIS_URL`, o `main.ts` liga o `@socket.io/redis-adapter` (`chat/redis-io-adapter.ts`): eventos e o `fetchSockets` (usado para saber se o destinatário está online) passam a valer entre instâncias. Testado com duas instâncias em `chat-redis.test.ts`.

**Push (CH-04):** quando o destinatário não tem socket conectado, o `ChatService` chama `PushSender.send({ userId, title: pseudônimo, body: trecho mascarado, data: { conversationId } })`. Hoje a implementação é o `LogPushSender` (só registra no log, sem o texto).

**Rate limit (NF-04):** mensagens têm limite próprio por usuário (`CHAT_THROTTLE_LIMIT`, padrão 30 por minuto); abrir conversa, fotos e denúncia usam o limite geral por IP.

**App:** `ChatClient` (HTTP e memória), `createChatRealtime` (adaptador do `socket.io-client`, só websocket, injetável; renova a sessão quando o token é recusado e reconecta quando o servidor derruba ou a rede falha no primeiro handshake), aba Chat (`ChatListScreen`: pseudônimo, pet, última mensagem, hora, não lidas, atualizada pelo socket) e tela `chat/[id]` (`ConversationScreen`: aviso fixo contra golpes, mensagens com "Lida", texto, foto da galeria, localização aproximada com "Abrir no mapa", carregar mais antigas, menu com compartilhar contato, bloquear e denunciar). O botão "Conversar" do detalhe da ocorrência abre a conversa (desabilitado para o autor). O socket conecta só com a sessão aberta (`SessionChatProvider`). Sem `EXPO_PUBLIC_API_URL`, chat em memória e nada em tempo real.

Pendências:

- [x] **Push real (CH-04):** `ExpoChatPushSender` envia pelo Expo Push para os tokens registrados pela S5 e apaga os inválidos; tocar na notificação abre `chat/<conversationId>`. Receber de fato exige o development build (no Expo Go Android não chega).
- [ ] Telefone opcional no perfil (CH-07 fala em "e-mail ou telefone"); hoje só o e-mail é revelado.
- [ ] Tela ou rotina de moderação para `chat_reports` (hoje só a fila no banco).
- [ ] O mascaramento não pega número por extenso ("nove oito sete...") nem perfil de rede social ("@fulano").
- [ ] Fotos do chat nunca enviadas deixam linhas em `chat_photos` (mesma limpeza pendente das fotos de pet).
- [ ] Indicador de "digitando" e de online não existem.
- [ ] Rodar `pnpm dev` na API para aplicar a migração `006_chat.sql` no Supabase.
- [ ] Testar com dois aparelhos (Expo Go) e medir o tempo de entrega (CH-03 E2E); teste de carga do chat com k6.

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

### Melhorias pedidas no teste (S2)

- [x] Raio da aba Início escolhido pelo usuário: 1, 3, 5, 10, 20 ou 30 km (API aceita até 30).
- [x] "Perdi meu pet" lista os pets cadastrados para escolher; os dados e as fotos do pet entram no alerta.
- [x] Local da ocorrência: "Minha localização" ou "Outro endereço", procurado com o geocodificador do aparelho (`expo-location`), com ajuste fino arrastando o pino no mapa (`PinPicker`).

### Ajustes do segundo teste no Expo Go (`feat/ajustes-teste-2`)

- [x] "Como chegar" quebrava ao escolher Maps/Waze: o `Linking.openURL` era passado solto e perdia o `this`. Agora `createDeviceDirections` chama pelo objeto e, se não abrir, avisa em vez de quebrar.
- [x] Aba Início em grade de duas colunas.
- [x] Tipo da ocorrência em destaque: faixa colorida no topo do card e etiqueta sólida em todo o app, com cor de texto legível por tipo (`textOn` + `contrastRatio` no shared; branco não lê no amarelo nem no verde).
- [x] "Marcar no mapa": terceira opção de local, com mapa maior em que se toca na rua; funciona sem permissão de localização.
- [x] Busca de endereço restrita a 50 km de quem procura, com a cidade dele acrescentada ao texto quando não foi digitada.

### Terceira rodada de pedidos (`feat/ajustes-teste-2`)

- [x] Botão da aba Início: "Registrar ocorrência".
- [x] Outras espécies: em "Outros", pássaro, coelho, roedor, réptil e outro animal (`SPECIES`/`speciesLabel` no shared, migração `008_more_species.sql`, filtro "Outros" no mapa e `species=others` na API).
- [x] Tutorial de boas-vindas em 4 passos, mostrado uma vez depois do primeiro acesso (guardado no `expo-secure-store`) e revisto em Ajuda → "Ver o tutorial de novo".

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

### "Vi este pet" (`feat/vi-este-pet`)

- [x] Botão "Vi este pet" no detalhe de um pet perdido (aberto, de outra pessoa): abre o registro já como avistado, com espécie, nome, raça e cor do pet.
- [x] API: `POST /occurrences` aceita `sightingOf` (só para `seen`, apontando para um `lost` aberto de outra pessoa; migração `009_sightings.sql`). O disparo avisa o tutor em qualquer distância e mesmo no horário de silêncio, com o push "Alguém viu o Thor!"; o alerta genérico de proximidade não repete para ele.
- [ ] Testar no aparelho com duas contas.
