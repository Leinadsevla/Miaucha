# Miaucha

App mobile (TCC) para reencontrar pets perdidos: ocorrências no mapa, alertas de proximidade e chat por pseudônimo.

- Plano, specs (CH/AL/MP/NF) e matriz de testes: `Miaucha — Plano de Execução.md`
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
- **Fontes:** classes `font-sans`, `font-nunito-semibold`, `font-nunito-bold`, `font-nunito-black`. Não use `font-bold` para trocar a fonte.
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
cd apps/mobile && npx expo start --tunnel ngrok        # Expo Go pela internet (o --tunnel padrão do SDK 58 exige login na conta Expo)
```

## Armadilhas já resolvidas (não desfaça)

- RNTL 14: `render`, `fireEvent` e `act` são assíncronos; use `await` e callbacks `async` em `it`, nunca em `describe`.
- `jest-expo` 58 exige Jest 30.
- Jest usa o build CJS do Lucide via `moduleNameMapper` (o ESM `.mjs` não é transformado). Não coloque `lucide-react-native` no `transformIgnorePatterns`: deixa os testes muito lentos.
- pnpm 12 usa links isolados (o `.npmrc` com `node-linker` é ignorado). Por isso `react-native-css-interop` é dependência direta do app; sem ele o Metro não acha `react-native-css-interop/jsx-runtime`.
- `pnpm-workspace.yaml` tem `minimumReleaseAgeExclude` para pacotes do Expo publicados há pouco; o pnpm adiciona isso sozinho.
- No Expo Router 58, o `tabBar` recebe `navigateToTab(routeKey)` e não `navigation`.
- `react-native-safe-area-context` e `react-native-reanimated` são mockados em `apps/mobile/jest.setup.ts`.
- NativeWind 4: nunca adicione num condicional utilitários que usam variável CSS (`shadow-*`, `ring-*`, `scale-*`, `translate-*`, gradientes). O componente é "promovido" depois da primeira renderização e, em dev, o app quebra com "Couldn't find a LinkingContext context". Use `style` para o efeito condicional. O teste `src/__tests__/nativewind-rules.test.ts` barra isso; o Jest não reproduz o erro em si.
- Rodar a partir do OneDrive deixa `pnpm install` muito lento (4 a 6 min).
- Nunca deixe um `package-lock.json` na raiz: o `npx expo install` passa a achar que o projeto usa npm e falha.
- O app escolhe a API real ou o login falso por `EXPO_PUBLIC_API_URL` (`apps/mobile/.env.local`, ver `.env.example`). Leia sempre como `process.env.EXPO_PUBLIC_API_URL`: o Expo não embute a variável se você desestruturar.
- NestJS 12 é publicado só como ESM. O Jest da API roda com `node --experimental-vm-modules` (já está no script `test`); rode pelo `pnpm test`, não por `npx jest`.
- A API roda com `node -r @swc-node/register` (scripts `dev`/`start`) porque o `@miaucha/shared` é publicado como fonte TypeScript. Não troque por `tsx`: ele não emite os metadados de decorators e a injeção de dependências do Nest quebra.
- Pacotes com script de instalação precisam ser liberados em `allowBuilds` no `pnpm-workspace.yaml` (`pnpm approve-builds <pkg>`). Só o `argon2` precisa de verdade.
- Nos testes de integração da API, todos os arquivos usam o mesmo banco: crie dados com `uniqueEmail()` em vez de apagar tabelas. Para buscas geográficas, cada teste usa um ponto sorteado longe dos outros (`uniqueSpot()` em `test/occurrences.test.ts`).
- Busca por bbox: use `public_location::geometry && st_makeenvelope(...)` (tem índice próprio). O `&&` direto na `geography` compara caixas em 3D e não é um retângulo de lat/lng.
- O storage S3 dos testes é o RustFS (`rustfs/rustfs`), porque o MinIO parou de publicar imagens no Docker Hub. Não volte para `minio/minio`.
- Fotos: o bucket é privado e a API só devolve URLs assinadas. O `S3Client` usa `requestChecksumCalculation: "WHEN_REQUIRED"`; sem isso a URL de upload exige checksums que o aparelho não calcula.
- Upload de arquivo local no app: use o `UploadTask` do `expo-file-system` (`features/pets/fileUploader.ts`). `fetch(uri).blob()` não lê `file://` no SDK 58 e envia o texto "File not found" no lugar da foto. A API confere os primeiros bytes (`image-signature.ts`) e recusa o que não for imagem.
- Mapa: `react-native-maps` e `supercluster` (com o `kdbush`) são ESM e estão no `transformIgnorePatterns` do Jest. No Jest o mapa é o mock `src/test-utils/reactNativeMapsMock.tsx` (ligado no `jest.setup.ts`): `MapView`/`Marker` viram `View` com as props, e `mapCommands.animateToRegion` é um `jest.fn`. Para simular o mapa: `fireEvent(map, "regionChangeComplete", region)`.
- Marcador com view própria (`Marker` com filhos): `tracksViewChanges` ligado só por um momento depois de montar ou mudar a aparência (`MapMarkers.tsx`). Sempre ligado deixa o mapa lento; desligado de cara deixa o marcador em branco no Android.
- Cache grande no aparelho (ex.: último mapa, MP-08) vai num arquivo do `expo-file-system` (`File`/`Paths.document`), não no `expo-secure-store`.
- App: chamadas autenticadas passam pelo `ApiSession` (`features/auth/apiSession.ts`), compartilhado por todos os clientes, para existir um único refresh por vez.
