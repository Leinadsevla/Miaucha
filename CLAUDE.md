# Miaucha

App mobile (TCC) para reencontrar pets perdidos: ocorrências no mapa, alertas de proximidade e chat por pseudônimo.

- Plano, specs (CH/AL/MP/NF) e matriz de testes: `Miaucha — Plano de Execução.md`
- Deploy: API no Render (`docs/DEPLOY-RENDER.md`); app pelo EAS com CI/CD no GitHub Actions (`docs/DEPLOY-APP.md`)
- Estado atual e próximas tarefas: `docs/PROXIMOS-PASSOS.md`
- Protótipo visual (referência, não roda no app): `docs/design/design.tsx`

## Estrutura

- `apps/mobile`: Expo SDK 58, Expo Router (rotas em `src/app`), NativeWind 4, Jest 30 + RNTL 14. Leia `apps/mobile/AGENTS.md` antes de mexer em APIs do Expo.
- `packages/shared`: tokens de cor, tipos e regras puras usadas por app e API.
- `apps/api`: NestJS 12 + PostgreSQL/PostGIS (via `pg` e migrações SQL em `apps/api/migrations`; banco remoto no Supabase, pelo Session pooler). Testes unitários em `src/**/*.test.ts`; de integração em `test/`, com Supertest + Testcontainers (precisam do Docker).

## Regras do projeto

- **TDD sempre:** teste primeiro, rodar e ver falhar pelo motivo certo, implementar o mínimo, rodar de novo. Regras puras vão para `packages/shared` ou arquivos `.ts` testáveis; arquivos em `src/app` só ligam peças já testadas.
- **Privacidade é requisito, não detalhe:** a API pública nunca devolve e-mail, telefone ou coordenada exata. Ocorrências expõem só `publicLocation` (deslocada ~150 m, MP-07) e `authorPseudonym` (CH-02). Localização do usuário só como geohash ~1 km (AL-06).
- **RLS em toda tabela:** o banco remoto é Supabase, que expõe o schema `public` pela Data API. Toda migração que cria tabela precisa de `alter table <t> enable row level security;` (o teste `row-level-security.test.ts` falha se faltar).
- **Cores:** sempre pelos tokens (`colors` do shared / classes `bg-primary`, `text-lost`...). Cor do marcador = tipo da ocorrência; ícone = espécie (MP-01). Se mudar uma cor, mude em `packages/shared/src/theme.ts` e em `apps/mobile/tailwind.config.js` (um teste compara os dois).
- **Logo:** sempre o componente `AppLogo` (`components/AppLogo.tsx`, símbolo em `assets/logo-symbol.png`), nunca emoji ou ícone de pata no lugar da marca. Ícones e splash nativos saem de `assets/logo-original.png` pelo `apps/mobile/scripts/gerar-icones.py` e só mudam num build novo.
- **Visual (tokens em `packages/shared/src/theme.ts`):** telas brancas, com a cor da marca só em detalhes. `brand` (laranja queimado, texto branco com 5:1) é a cor de botões, links, ícones ativos e de **um** bloco de destaque por tela; nada de fundo grande laranja nem degradê. Fundos de apoio: `brandSoft`, `cream`. Azul (`accent`) só para informação. Tipo da ocorrência: cor sólida só no mapa; nos cartões é o `StatusBadge` (fundo claro + ponto colorido). Texto de erro em `lostDeep` (o `lost` não passa no contraste em texto pequeno). Sombra só por `style={elevation.card | raised | floating}`; cor com transparência por `withAlpha(cor, a)`; escurecer foto por `overlay`. Botão = `PrimaryButton` (`brand` é o padrão; `soft` para apoio; `outline` para ação neutra; `buttonColors` tem teste de contraste AA). Alvo de toque mínimo de 44 px (`IconButton`, `TextLink`). Estados vazios/erro com `EmptyState`, carregando com `Skeleton`/`SkeletonList`. Cabeçalho das abas: `TabHeader` (branco).
- **Fontes:** Plus Jakarta Sans, pelas classes `font-sans` (normal), `font-ui-medium`, `font-ui-semibold`, `font-ui-bold` e `font-ui-extrabold` (títulos, com `tracking-tight`). Não use `font-bold` para trocar a fonte. Os nomes ficam em `fonts` no shared e em `tailwind.config.js` (um teste compara).
- **Git:** uma branch por tarefa, PR revisado por outra pessoa antes do merge. Mensagens de commit em português.
- Textos da interface em português do Brasil.

## Comandos

```bash
pnpm install                 # na raiz
pnpm test                    # todos os testes
pnpm typecheck
cd apps/mobile && npx jest src/features   # só uma pasta
cd apps/api && pnpm test:unit                # API sem Docker
cd apps/api && pnpm test test/auth-google    # um arquivo de integração
cd apps/api && pnpm dev                      # API local (lê apps/api/.env; ver .env.example)
cd apps/mobile && npx expo install <pkg> "--" --dev   # no Windows, o "--" é obrigatório para --dev
cd apps/mobile && npx expo export --platform android  # valida Metro + NativeWind sem aparelho
cd apps/mobile && npx expo start --tunnel ngrok        # development build pela internet (o --tunnel padrão do SDK 58 exige login na conta Expo)
cd apps/mobile && npx eas-cli build -p android --profile development  # APK com o dev client (o mapa MapLibre não roda no Expo Go)
cd apps/mobile && npx eas-cli build -p android --profile preview      # APK para instalar e apresentar
```

## Armadilhas já resolvidas (não desfaça)

- RNTL 14: `render`, `fireEvent` e `act` são assíncronos; use `await` e callbacks `async` em `it`, nunca em `describe`.
- `jest-expo` 58 exige Jest 30.
- Jest usa o build CJS do Lucide via `moduleNameMapper` (o ESM `.mjs` não é transformado). Não coloque `lucide-react-native` no `transformIgnorePatterns`: deixa os testes muito lentos.
- pnpm 12 usa links isolados (o `.npmrc` com `node-linker` é ignorado). Por isso `react-native-css-interop` é dependência direta do app; sem ele o Metro não acha `react-native-css-interop/jsx-runtime`.
- Pelo mesmo motivo, `babel-preset-expo` e `@babel/plugin-transform-react-jsx` (pedido pelo babel do NativeWind) são dependências diretas do app. O `npx expo` esconde a falta deles (o atalho do pnpm põe a pasta interna no `NODE_PATH`), mas o build de release no EAS (Gradle, `createBundleReleaseJsAndAssets`) e o `eas update` chamam o `node` direto e falham com "Cannot find module". Para validar como o EAS: `env -u NODE_PATH CI=1 node node_modules/expo/bin/cli export --experimental-bundle --platform=android --clear` em `apps/mobile`.
- Não use `publicHoistPattern` (nem mude o hoist) no `pnpm-workspace.yaml`: o Render guarda o `node_modules` em cache e o `pnpm install --frozen-lockfile` falha com `ERR_PNPM_PUBLIC_HOIST_PATTERN_DIFF` (o deploy cai em ~13 s). Falta de pacote no Babel se resolve com dependência direta do app.
- `eas update` precisa de `--environment` no modo não interativo e de `--platform android` (o app só é publicado para Android; a web roda só em desenvolvimento).
- `pnpm-workspace.yaml` tem `minimumReleaseAgeExclude` para pacotes do Expo publicados há pouco; o pnpm adiciona isso sozinho.
- No Expo Router 58, o `tabBar` recebe `navigateToTab(routeKey)` e não `navigation`.
- `react-native-safe-area-context` e `react-native-reanimated` são mockados em `apps/mobile/jest.setup.ts`.
- NativeWind 4: nunca adicione num condicional utilitários que usam variável CSS (`shadow-*`, `ring-*`, `scale-*`, `translate-*`, gradientes). O componente é "promovido" depois da primeira renderização e, em dev, o app quebra com "Couldn't find a LinkingContext context". Use `style` para o efeito condicional. O teste `src/__tests__/nativewind-rules.test.ts` barra isso; o Jest não reproduz o erro em si.
- Rodar a partir do OneDrive deixa `pnpm install` muito lento (4 a 6 min).
- Nunca deixe um `package-lock.json` na raiz: o `npx expo install` passa a achar que o projeto usa npm e falha.
- Modo demonstração: os exemplos têm fotos embutidas (`assets/demo`, por `features/demo/demoPhotos.ts`, que usa o `expo-asset`). `EXPO_PUBLIC_DEMO=1` usa os clientes falsos mesmo com `EXPO_PUBLIC_API_URL` (e em build de produção), com aviso na tela de login. Fora dele, o botão do Google só aparece se o `AuthClient` tiver `supportsGoogle`.
- Login com Google na web: popup do Google que volta para a rota `/google-callback` com o ID token (`features/auth/googleWeb.ts`); liga com `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Client ID "Aplicativo da Web" com `<origem>/google-callback` nos redirecionamentos) e o mesmo ID em `GOOGLE_CLIENT_IDS` na API. No aparelho ainda falta o login nativo. O Firebase do projeto (`google-services.json`) é só para o push (FCM), não para login.
- Acabamento só da web (cursor, transições, anel de foco no teclado): `src/lib/web.css`, importado por `webStyles.web.ts` (no aparelho, `webStyles.ts` é vazio). Estados de mouse vêm do `hovered` do `Pressable`.
- Responsivo: `useLayout()` (`src/lib/layout.ts`). A partir de 900 px as abas viram `SideNav` (`tabBarPosition: "left"`) e a Início usa de 2 a 4 colunas; conteúdo de leitura fica em `centered(READING_MAX_WIDTH)`.
- O app escolhe a API real ou o login falso por `EXPO_PUBLIC_API_URL` (`apps/mobile/.env.local`, ver `.env.example`). Leia sempre como `process.env.EXPO_PUBLIC_API_URL`: o Expo não embute a variável se você desestruturar.
- NestJS 12 é publicado só como ESM. O Jest da API roda com `node --experimental-vm-modules` (já está no script `test`); rode pelo `pnpm test`, não por `npx jest`.
- A API roda com `node -r @swc-node/register` (scripts `dev`/`start`) porque o `@miaucha/shared` é publicado como fonte TypeScript. Não troque por `tsx`: ele não emite os metadados de decorators e a injeção de dependências do Nest quebra.
- Pacotes com script de instalação precisam ser liberados em `allowBuilds` no `pnpm-workspace.yaml` (`pnpm approve-builds <pkg>`). Só o `argon2` precisa de verdade.
- Nos testes de integração da API, todos os arquivos usam o mesmo banco: crie dados com `uniqueEmail()` em vez de apagar tabelas. Para buscas geográficas, cada teste usa um ponto sorteado longe dos outros (`uniqueSpot()` em `test/occurrences.test.ts`).
- Busca por bbox: use `public_location::geometry && st_makeenvelope(...)` (tem índice próprio). O `&&` direto na `geography` compara caixas em 3D e não é um retângulo de lat/lng.
- O storage S3 dos testes é o RustFS (`rustfs/rustfs`), porque o MinIO parou de publicar imagens no Docker Hub. Não volte para `minio/minio`.
- Fotos: o bucket é privado e a API só devolve URLs assinadas. O `S3Client` usa `requestChecksumCalculation: "WHEN_REQUIRED"`; sem isso a URL de upload exige checksums que o aparelho não calcula.
- Upload de arquivo local no app: use o `UploadTask` do `expo-file-system` (`features/pets/fileUploader.ts`). `fetch(uri).blob()` não lê `file://` no SDK 58 e envia o texto "File not found" no lugar da foto. A API confere os primeiros bytes (`image-signature.ts`) e recusa o que não for imagem.
- Chat: testes que usam o socket sobem a API com `app.listen(0)` (`createChatTestApp` em `test/chat-helpers.ts`, que também troca o `PushSender` por um falso); o `createTestApp` só faz `init()` e o `socket.io-client` não conecta.
- Chat: o `ChatThrottlerGuard` sobrescreve o `canActivate` do `ThrottlerGuard` de propósito. A rota de mensagens usa `@SkipThrottle()` para sair do limite geral, e o `canActivate` original leria esse mesmo metadado e pularia o limite do chat.
- Socket.IO no app: o `socket.io-client` não reconecta sozinho quando o servidor recusa o handshake (token expirado) ou derruba a conexão; o `createChatRealtime` (`features/chat/chatRealtime.ts`) cuida disso. O token vai por `auth` em função, para cada tentativa ler o token salvo mais novo.
- Diálogos: use `showAlert` (`src/lib/dialog.ts`), nunca `Alert.alert`. No react-native-web o `Alert.alert` não faz nada (ações como "Marcar como resolvido" ficavam mudas); a versão `dialog.web.ts` usa `confirm`/`alert` do navegador. "Abrir configurações": `openAppSettings` (`src/lib/settings.ts`).
- Web (`cd apps/mobile && npx expo start --web`): módulos nativos têm substituto. O Metro troca `expo-secure-store` por `src/web-stubs/expo-secure-store.ts` (`localStorage`); o mapa usa `features/map/MapCanvas.web.tsx` (`maplibre-gl` 5; o 6 carrega o worker por `import.meta` e o Metro não monta); a foto vai por `createBrowserUpload` (`fetch` do `blob:`). Para trocar um módulo nativo inteiro, use `metro.config.js` (`webStubs`); para trocar um arquivo do app, crie `nome.web.ts(x)` ao lado.
- Web e API: o navegador só chama a API se ela liberar a origem em `CORS_ORIGINS` (vazio = CORS desligado; o Render hoje não libera). Para a web usar outra API sem mexer na do aparelho, `EXPO_PUBLIC_WEB_API_URL` (ex.: API local com `CORS_ORIGINS=http://localhost:8081`). O `.env.local` vence variáveis vazias no `expo start --web`; use a variável da web em vez de tentar apagar a geral.
- Mapa: MapLibre (`@maplibre/maplibre-react-native` 11) com o estilo gratuito do OpenFreeMap (OpenStreetMap, sem chave nem cartão). Só `features/map/MapCanvas.tsx` importa o MapLibre; as telas usam `MapCanvas`, `MapPoint` e `DraggablePoint`, que falam em `Region` (centro + deltas) e `LatLng`. O MapLibre usa `[lng, lat]` e limites `[oeste, sul, leste, norte]` (`regionToBounds`/`boundsToRegion` em `region.ts`).
- O MapLibre não existe no Expo Go: o app precisa de development build (`eas build --profile development`, com o `expo-dev-client`). Com o dev client instalado, o `expo start` abre no development build; `--go` força o Expo Go, mas o mapa não funciona lá.
- No Jest o mapa é o mock `src/test-utils/maplibreMock.tsx` (ligado no `jest.setup.ts`): `Map`, `Camera`, `Marker` e `ViewAnnotation` viram `View` com as props, e `cameraCommands.fitBounds` é um `jest.fn`. Para simular o mapa: `fireEvent(map, "regionDidChange", mapEvents.region(region))` e `fireEvent.press(map, mapEvents.at(lat, lng))`. O `supercluster` (com o `kdbush`) é ESM e está no `transformIgnorePatterns`.
- A atribuição do mapa (botão "i") é exigida pela licença do OpenStreetMap: não desligue `attribution` no `MapCanvas`.
- Cache grande no aparelho (ex.: último mapa, MP-08) vai num arquivo do `expo-file-system` (`File`/`Paths.document`), não no `expo-secure-store`.
- App: chamadas autenticadas passam pelo `ApiSession` (`features/auth/apiSession.ts`), compartilhado por todos os clientes, para existir um único refresh por vez.
- Alertas (S5): o disparo roda depois da resposta do `POST /occurrences`. Nos testes de integração, espere com `await ctx.app.get<AlertQueue>(ALERT_QUEUE).onIdle()` antes de conferir alertas ou push. O `createTestApp` sempre troca o Expo Push pelo `FakePushSender` (`ctx.push`): nenhum teste chama o Expo de verdade.
- `PUT /me/location` aceita só `{ geohash }` de 6 caracteres; qualquer campo a mais é 400. O geohash é calculado no app (`encodeGeohash` do shared); nunca mande lat/lng do usuário para a API.
- `expo-notifications` só é carregado com `require` quando o push é possível (`features/alerts/runtime.ts`): no Expo Go Android o push remoto não existe desde o SDK 53 e nem importamos o módulo. Para saber se é Expo Go use `isRunningInExpoGo()` do pacote `expo`; o `executionEnvironment` vale `storeClient` também no development build.
- `features/alerts/geofencingNative.ts` define a tarefa do `expo-task-manager` no escopo do módulo e só é carregado com `EXPO_PUBLIC_GEOFENCING=1` fora do Expo Go. Não importe esse arquivo em outro lugar (nem pelo `index.ts`).
