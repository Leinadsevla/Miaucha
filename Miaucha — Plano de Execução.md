# Miaucha — Plano de Execução

Nov 17, 2026 · @tcc 5 periodo

## Visão geral

O Miaucha entrega um MVP mobile em 6 sprints de 2 semanas (cerca de 12 semanas), cobrindo as três funcionalidades: chat interno, alertas de proximidade e mapa interativo.

**Objetivo:** ajudar tutores a reencontrar pets perdidos conectando-os, por geolocalização, a quem avistou ou encontrou o animal, sem expor dados pessoais.

**Escopo do MVP:** app Android e iOS, API, banco geográfico e notificações push. Ficam fora: painel web para ONGs, diretório de clínicas/ONGs/petshops, rotas dentro do app e IA de reconhecimento por foto (v2).

| Camada | Tecnologia | Por quê |
| --- | --- | --- |
| App mobile | Expo (React Native) + Expo Router + TypeScript | Geofencing e push nativos; mesma linguagem do backend |
| Estilo | NativeWind v4 + lucide-react-native + fonte Nunito | Reaproveita as classes Tailwind do protótipo `design.tsx` |
| Mapa | MapLibre (OpenFreeMap) + supercluster | Marcadores nativos com clustering |
| API | NestJS (Node + TypeScript) | Módulos por domínio, WebSocket integrado |
| Banco | PostgreSQL + PostGIS | Consultas por raio e bbox com índice GiST |
| Tempo real e filas | Redis + Socket.IO + BullMQ | Chat, presença, envio de alertas em lote |
| Notificações | Expo Push (FCM/APNs) | Um único serviço para Android e iOS |
| Fotos | Storage S3-compatível (ex.: Cloudflare R2, Supabase Storage) | Barato e com URLs assinadas |
| Infra | Docker Compose local; Railway ou Render em produção; EAS Build | Deploy simples para time pequeno |

**Premissa:** prazo e tamanho do time ainda não foram definidos; o plano assume 3 a 4 pessoas e ajusta as sprints se o prazo for menor.

## Especificações e critérios de aceite

Cada especificação recebeu um código (CH, AL, MP, NF) usado na matriz de rastreabilidade e nos testes.

### Chat interno

| Código | Critério de aceite |
| --- | --- |
| CH-01 | Uma conversa só pode ser aberta a partir de uma ocorrência ativa, entre o tutor e outro usuário |
| CH-02 | Os participantes se veem apenas por pseudônimo; telefone e e-mail nunca aparecem na API do chat |
| CH-03 | Mensagens de texto chegam ao outro participante em menos de 2 s quando ele está online |
| CH-04 | Participante offline recebe push com o pseudônimo e um trecho da mensagem |
| CH-05 | É possível enviar foto e a localização atual ("encontrei aqui") dentro do chat |
| CH-06 | Números de telefone, e-mails e links digitados são mascarados antes de salvar |
| CH-07 | Contato direto (e-mail ou telefone opcional do perfil) só é revelado se os dois participantes aceitarem (opt-in duplo) |
| CH-08 | Usuário pode bloquear e denunciar; bloqueado não envia mais mensagens |
| CH-09 | Histórico paginado por cursor, com indicador de lida |

### Alertas de proximidade

| Código | Critério de aceite |
| --- | --- |
| AL-01 | Ao criar uma ocorrência, usuários cuja localização aproximada está dentro do raio recebem push em menos de 1 min |
| AL-02 | Com permissão "sempre", o app avisa ao entrar na área de uma ocorrência ativa, mesmo fechado |
| AL-03 | O app monitora as ocorrências mais próximas dentro do limite do sistema (iOS 20, Android 100 regiões) e recalcula ao se deslocar |
| AL-04 | O usuário escolhe o raio (1, 3 ou 5 km) e um horário de silêncio |
| AL-05 | Cada usuário recebe no máximo 1 alerta por ocorrência |
| AL-06 | O servidor guarda só a localização aproximada (geohash de cerca de 1 km), nunca o trajeto |
| AL-07 | Quem negar a localização em segundo plano continua recebendo alertas de casos novos (AL-01) |
| AL-08 | Tocar no alerta abre o detalhe da ocorrência no mapa |

### Mapa interativo

| Código | Critério de aceite |
| --- | --- |
| MP-01 | Cor do marcador por tipo: perdido (vermelho), avistado (amarelo) e encontrado (verde); ícone de cão ou gato dentro do marcador |
| MP-02 | O mapa carrega apenas as ocorrências da área visível, com resposta da API em menos de 300 ms |
| MP-03 | Pontos próximos são agrupados (clustering) e se separam ao dar zoom |
| MP-04 | Tocar no marcador mostra foto, nome, espécie e tempo desde o registro |
| MP-05 | Filtros por tipo, espécie e período |
| MP-06 | Botão "Como chegar" abre Google Maps ou Waze com a rota até o ponto |
| MP-07 | O local exibido tem deslocamento aleatório de cerca de 150 m; o ponto exato não sai da API |
| MP-08 | Sem internet, o último mapa carregado continua visível |

### Requisitos não funcionais

| Código | Requisito |
| --- | --- |
| NF-01 | LGPD: consentimento explícito para localização, política de privacidade e exclusão de conta que apaga os dados |
| NF-02 | Login com e-mail e senha (com verificação do e-mail por código) ou conta Google; sessão JWT com refresh |
| NF-03 | Ocorrências expiram em 30 dias sem atualização |
| NF-04 | Rate limit nas rotas de criação e no chat |
| NF-05 | HTTPS e WSS em todas as conexões; fotos acessadas por URL assinada |
| NF-06 | App funciona em Android 10+ e iOS 15+ |

## Fases e sprints

A base técnica vem antes das funcionalidades: o mapa depende das ocorrências, e chat e alertas dependem das duas.

&#91;embedded content: roadmap do MVP · 6 sprints de 2 semanas\]

Cada sprint termina com uma demo no celular e só é considerada pronta quando cumpre a definição de pronto abaixo.

**Definição de pronto (vale para toda tarefa):** código revisado por outra pessoa em pull request, testes passando no CI, critério de aceite demonstrado num aparelho real e documentação da API atualizada.

### S1 · Fundação (semanas 1–2)

- [ ] Monorepo com `apps/mobile`, `apps/api` e `packages/shared` (tipos compartilhados)
- [ ] Docker Compose com PostgreSQL + PostGIS e Redis
- [ ] CI no GitHub Actions: lint, testes e build
- [ ] Projeto Expo com development build (necessário para geofencing e login Google)
- [ ] Design system: NativeWind, tokens de cor do protótipo, fonte Nunito e componentes base (Card, StatusBadge, PetCard, botões, campos)
- [ ] Login com e-mail/senha, verificação de e-mail por código e Google; sessão JWT (NF-02)
- [ ] Cadastro de pet com fotos em storage S3 (NF-05)
- [ ] Telas de consentimento de localização e política de privacidade (NF-01)

### S2 · Ocorrências (semanas 3–4)

- [x] Criar ocorrência (perdido, avistado, encontrado) com fotos e ponto no mapa (o ponto vem da localização atual; ajustar o pin no mapa fica para a S3)
- [x] Gerar `local_publico` com deslocamento de cerca de 150 m (MP-07)
- [x] Endpoints de busca por bbox e por raio com índice GiST (MP-02)
- [ ] Job diário que expira ocorrências sem atualização em 30 dias (NF-03) — a regra já vale nas buscas; falta o job
- [x] Marcar ocorrência como resolvida
- [x] Rate limit nas rotas de criação (NF-04)

### S3 · Mapa interativo (semanas 5–6)

- [x] Mapa com marcadores coloridos por tipo (MP-01)
- [x] Carregar por área visível ao mover o mapa, com debounce (MP-02)
- [x] Clustering com supercluster (MP-03)
- [x] Card de detalhe ao tocar no marcador (MP-04)
- [x] Filtros por tipo, espécie e período (MP-05)
- [x] Botão "Como chegar" com deep link para Google Maps e Waze (MP-06), no detalhe e no card do mapa; falta o teste manual
- [x] Cache do último mapa para uso offline (MP-08); falta o teste manual em modo avião

### S4 · Chat interno (semanas 7–8)

- [x] Modelo de conversa ligado à ocorrência, com pseudônimos (CH-01, CH-02)
- [x] Gateway WebSocket com Socket.IO e Redis pub/sub (CH-03; Redis opcional, só com `REDIS_URL`)
- [ ] Push quando o destinatário está offline (CH-04): interface `PushSender` chamada e testada; falta o Expo Push
- [x] Envio de foto e de localização atual (CH-05)
- [x] Filtro que mascara telefone, e-mail e links (CH-06)
- [x] Compartilhar contato com opt-in duplo (CH-07)
- [x] Bloquear e denunciar, com fila de moderação (CH-08; falta a tela de moderação)
- [x] Histórico paginado e confirmação de leitura (CH-09)

### S5 · Alertas de proximidade (semanas 9–10)

- [ ] Atualizar o geohash aproximado do usuário em mudanças significativas de local (AL-06)
- [ ] Job no BullMQ que, ao criar ocorrência, encontra usuários no raio e envia push (AL-01, AL-07)
- [ ] Geofencing com `expo-location` e `expo-task-manager` nas ocorrências mais próximas (AL-02, AL-03)
- [ ] Tela de preferências: raio e horário de silêncio (AL-04)
- [ ] Registro de alertas enviados para nunca repetir (AL-05)
- [ ] Deep link do push para o detalhe no mapa (AL-08)

### S6 · Testes e lançamento (semanas 11–12)

- [ ] Teste de campo com voluntários caminhando pela cidade com o app
- [ ] Exclusão de conta que apaga dados e fotos (NF-01)
- [ ] Testes de carga no mapa e no chat
- [ ] Correções da rodada de testes
- [ ] Publicação na Play Store (revisão mais rápida) e depois na App Store, com justificativa da localização em segundo plano

## Design

O protótipo `design.tsx` (React web + Tailwind) é a referência visual. As cores são laranja `#FF8A3D` (primária), azul `#2D6CDF` (secundária) e amarelo `#FFD447`, com a fonte Nunito. O porte para o app segue esta tabela:

| Sprint | Telas do protótipo | Telas novas |
| --- | --- | --- |
| S1 | Splash, Login, Perfil (estrutura), barra inferior | Verificar e-mail, Consentimento, Cadastro de pet |
| S2 | Registrar (com seletor perdido/avistado/encontrado) | — |
| S3 | Mapa, Início, Detalhe do pet | Filtros (bottom sheet) |
| S4 | Chat | Lista de conversas, bloquear/denunciar, opt-in de contato |
| S5 | Alertas | Preferências de alerta, explicação antes da permissão "sempre" |
| S6 | Revisão visual de todas as telas | Privacidade e exclusão de conta |

Ajustes no protótipo para cumprir as especificações:

- **Detalhe e chat:** pseudônimo no lugar do nome real e sem botão de telefone (CH-02, CH-07); endereço aproximado em vez do exato (MP-07); botão "Como chegar" (MP-06); botão "Eu vi" cria uma ocorrência de avistamento.
- **Chat:** menu com compartilhar contato, bloquear e denunciar (CH-07, CH-08); aviso fixo contra golpes; a aba Chat abre a lista de conversas.
- **Mapa:** cor por tipo e ícone por espécie (MP-01), clustering (MP-03) e filtros (MP-05).
- **Fora do MVP:** diretório de clínicas/ONGs e favoritar pet.

## Matriz de rastreabilidade

Todas as 31 especificações têm sprint e forma de verificação definidas; o projeto está completo quando cada linha passar no seu teste.

| Especificação | Sprint | Como verificar |
| --- | --- | --- |
| CH-01, CH-02 | S4 | Teste de integração: resposta da API do chat não contém telefone nem e-mail. ✅ `apps/api/test/chat.test.ts` (conversa só com ocorrência aberta, idempotente, nunca consigo mesmo; nenhuma resposta com e-mail, nome real ou id do outro) e `chat-socket.test.ts` (o mesmo nos eventos do socket) |
| CH-03 | S4 | Teste E2E com dois aparelhos, medindo o tempo de entrega. 🟡 Parcial: integração com `socket.io-client` (chega ao outro em < 2 s, terceiros não recebem, token inválido recusado) em `chat-socket.test.ts`, e entre duas instâncias com Redis em `chat-redis.test.ts`; falta o E2E com aparelhos |
| CH-04 | S4 | Teste manual com o app fechado. 🟡 Envio testado: push só para destinatário offline, com pseudônimo e trecho mascarado (`chat-socket.test.ts`), pelo Expo Push para os tokens do usuário (`chat-push.test.ts`); toque abre a conversa (`AlertsProvider.test.tsx`). Falta o teste manual num development build |
| CH-05 | S4 | Teste E2E de envio de foto e localização. 🟡 Parcial: integração (foto por URL assinada com as validações das fotos; localização guardada e devolvida a 50–200 m do real) em `chat.test.ts` e tela em `ConversationScreen.test.tsx`; falta o E2E |
| CH-06 | S4 | Teste unitário do filtro com lista de casos (telefones, e-mails, links). ✅ `packages/shared/src/__tests__/chat.test.ts` (inclui o que não pode ser mascarado: horários, valores, datas, CEP) e aplicado antes de salvar (`chat.test.ts`) |
| CH-07, CH-08 | S4 | Teste de integração dos fluxos de opt-in, bloqueio e denúncia. ✅ `apps/api/test/chat.test.ts` |
| CH-09 | S4 | Teste de integração da paginação. ✅ Cursor e leitura em `apps/api/test/chat.test.ts`; evento `message:read` em `chat-socket.test.ts` |
| AL-01, AL-07 | S5 | Teste de integração do job: usuário dentro do raio recebe, fora não recebe. ✅ `apps/api/test/alerts.test.ts`: dentro do raio escolhido recebe alerta e push; autor, fora do raio, desligado e localização antiga não; sem push token o alerta continua na lista; o `POST /occurrences` não espera o push. Falta medir o "menos de 1 min" com push real (development build) |
| AL-02, AL-03 | S5 | Teste de campo caminhando até uma ocorrência com o app fechado. 🟡 Escolha das regiões (iOS 20, Android 100) e recálculo testados (`geofencing.test.ts`, `alerts.test.ts` do shared); integração nativa pronta e desligada por flag até o development build |
| AL-04, AL-05 | S5 | Teste unitário das regras de raio, silêncio e deduplicação. ✅ `packages/shared/src/__tests__/alerts.test.ts` (raios, silêncio atravessando a meia-noite no fuso de São Paulo) e, na API, preferências e silêncio sem push; AL-05 com restrição única no banco e disparo repetido sem segundo alerta (`apps/api/test/alerts.test.ts`) |
| AL-06 | S5 | Inspeção do banco: só geohash, sem coordenada exata. ✅ `apps/api/test/alerts.test.ts`: só `occurrences` tem colunas geográficas, `user_locations` tem só `user_id`, `geohash` e `updated_at` (uma linha, sem histórico), a API recusa lat/lng; o app calcula o geohash no aparelho (`locationSync.test.ts`) |
| AL-08 | S5 | Teste manual tocando no push. 🟡 Lógica testada (`notificationTarget`, `AlertsProvider.test.tsx`: toque e app aberto pela notificação abrem a ocorrência; tocar na aba Alertas abre o detalhe); falta o teste manual no development build |
| MP-01, MP-04, MP-05 | S3 | Teste de componente e revisão visual. 🟡 Testes de componente passando (`apps/mobile/src/features/map/__tests__/map-components.test.tsx`, `MapScreen.test.tsx`, `filters.test.ts`); falta a revisão visual no aparelho |
| MP-02 | S2, S3 | Teste de carga com 5 mil ocorrências; resposta abaixo de 300 ms. 🟡 Parcial: busca por raio e bbox pela localização pública com índice GiST e teste de integração com 5 mil ocorrências abaixo de 300 ms (`apps/api/test/occurrences.test.ts`); no app, busca só da área visível com debounce de 400 ms e sem repetir a busca em movimentos pequenos (`apps/mobile/src/features/map/__tests__/region.test.ts`, `mapLoader.test.ts`); falta o k6 |
| MP-03 | S3 | Teste visual com pontos agrupados em vários níveis de zoom. 🟡 Agrupamento e separação por zoom testados (`apps/mobile/src/features/map/__tests__/clusters.test.ts`, `MapScreen.test.tsx`); falta o teste visual no aparelho |
| MP-06 | S3 | Teste manual no Android e no iOS |
| MP-07 | S2 | Teste unitário: distância entre ponto real e público fica entre 50 e 200 m. ✅ `packages/shared/src/__tests__/geo.test.ts` (2 mil sorteios) e, na API, ponto público entre 50 e 200 m e nenhuma resposta com a coordenada exata (`apps/api/test/occurrences.test.ts`) |
| MP-08 | S3 | Teste manual em modo avião. 🟡 Cache e queda para o último mapa testados (`apps/mobile/src/features/map/__tests__/mapCache.test.ts`, `mapLoader.test.ts`, `MapScreen.test.tsx`); falta o teste manual |
| NF-01 | S1, S6 | Checklist LGPD revisado pelo grupo |
| NF-02 | S1 | Teste de integração: cadastro, verificação de e-mail, login com senha e com Google (token mockado). ✅ Passando na API (`apps/api/test/auth-*.test.ts`); app ligado à API por e-mail e senha (`httpAuthClient.test.ts`); falta o Google no app |
| NF-03 | S2 | Teste unitário do job de expiração. ✅ Regra pura testada (`packages/shared/src/__tests__/occurrences.test.ts`) e aplicada na consulta: expirada some da busca (`apps/api/test/occurrences.test.ts`); o job diário ainda não existe |
| NF-04 | S2, S4 | Teste de integração: excesso de requisições retorna 429. Rotas `/auth`, criação de pet e criação de ocorrência cobertas (`apps/api/test/rate-limit.test.ts`); mensagens do chat (por usuário) e abrir conversa em `apps/api/test/chat-rate-limit.test.ts` |
| NF-05 | S1 | Verificação de que não há URL pública de foto. ✅ Fotos de pets: acesso sem assinatura recusado e toda URL devolvida é assinada (`apps/api/test/pets.test.ts`, `photo-storage.test.ts`); HTTPS/WSS em produção ainda a conferir |
| NF-06 | S6 | Teste em aparelhos Android 10 e iOS 15 ou emuladores |

## Estratégia de testes

A maior parte dos testes fica no backend, onde estão as regras de privacidade e de geolocalização; o que depende do aparelho (geofencing, push) é testado em campo.

| Nível | Ferramenta | O que cobre |
| --- | --- | --- |
| Unitário | Jest | Filtro de mascaramento, regras de raio e silêncio, deslocamento do ponto, expiração |
| Integração (API) | Jest + Supertest + Testcontainers (Postgres/PostGIS real) | Endpoints, consultas geográficas, chat via WebSocket, rate limit |
| Componentes (app) | React Native Testing Library | Telas, marcadores, filtros, formulários |
| E2E (app) | Maestro | Fluxos completos: criar ocorrência, abrir chat, receber mensagem |
| Carga | k6 | Mapa com 5 mil ocorrências e chat com conexões simultâneas |
| Campo | Aparelhos reais | Geofencing com app fechado, push, bateria, GPS em rua |

**Meta de cobertura:** 70% no backend; no app, os fluxos críticos cobertos por E2E.

**Dados de teste:** um script de seed cria ocorrências espalhadas pela cidade, para testar mapa e alertas sem depender de casos reais.

## Riscos e mitigação

O maior risco é o geofencing em segundo plano, porque depende de permissão do usuário e da revisão das lojas; por isso o alerta pelo servidor (AL-01) vem antes e funciona sozinho.

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Usuário nega localização "sempre" | Alto | Alerta pelo servidor cobre casos novos; tela explicando o benefício antes de pedir a permissão |
| App Store recusa localização em segundo plano | Alto | Publicar primeiro na Play Store; justificar o uso no formulário da Apple com vídeo do recurso |
| Golpes no chat (pedido de dinheiro por resgate) | Alto | Pseudônimos, mascaramento de contatos, denúncia e aviso fixo no topo da conversa |
| Contas falsas criadas por e-mail | Médio | Verificação do e-mail por código, rate limit no cadastro e no login, denúncia no chat |
| Pouca gente usando no início (mapa vazio) | Médio | Lançar em uma cidade só e divulgar com ONGs e clínicas veterinárias locais |
| Atraso no chat em tempo real | Médio | Se a sprint apertar, entregar primeiro com polling e trocar por WebSocket depois |
| Geofencing não funciona no Expo Go | Baixo | Usar development build desde a S1 |

## Organização do time e próximos passos

Com 3 ou 4 pessoas, a divisão abaixo deixa backend e app avançando em paralelo; os papéis são sugestões, e todos revisam o código de todos.

| Papel | Responsabilidade principal |
| --- | --- |
| Backend | API, PostGIS, jobs de alerta, chat |
| Mobile | Telas, mapa, geofencing, push |
| Full stack / QA | Integração, testes E2E, CI, publicação nas lojas |
| Produto / design (pode acumular) | Telas no Figma, critérios de aceite, testes de campo |

**Rituais:** planejamento no início de cada sprint, check-in curto 2 a 3 vezes por semana e demo no fim. As tarefas deste plano viram issues no GitHub Projects, uma por item das listas de sprint.

**Próximos passos:**

- [ ] Definir o prazo final e o tamanho do time, e ajustar as sprints
- [ ] Escolher a cidade de lançamento
- [ ] Criar o repositório e o quadro no GitHub Projects
- [ ] Desenhar as telas principais (mapa, detalhe, chat, criar ocorrência)
- [ ] Iniciar a S1
