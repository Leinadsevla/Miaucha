# CI/CD: API no Render e app no EAS (dev e prod)

Workflows em `.github/workflows`:

| Workflow | Quando roda | O que faz |
| --- | --- | --- |
| `ci.yml` | Todo PR (e chamado pelos outros) | `pnpm typecheck` e `pnpm test` (inclui a integração da API, com Docker) |
| `deploy.yml` | **dev:** push na `s1/fundacao` · **prod:** tag `v*` · ou "Run workflow" escolhendo o ambiente | CI → deploy da API no Render (deste commit) → espera o `/health` mostrar o commit → `eas update` no canal do ambiente |
| `eas-build.yml` | Tag `v*` (perfil `production`) ou "Run workflow" (escolhe o perfil) | CI → `eas build` Android na nuvem do Expo |

Fluxo do dia a dia:

- **Dev:** fez merge na `s1/fundacao` → API dev atualizada → APKs do perfil `preview` recebem o JS novo ao abrir o app.
- **Prod:** `git tag v1.2.0 && git push origin v1.2.0` → API prod atualizada → canal `production` recebe o JS novo, e o `eas-build.yml` gera o build de produção.

A API sobe sempre antes do app, porque o app novo pode depender de rotas novas. O `deploy.yml` só publica o app depois que o `/health` responde com o commit novo (o Render preenche `RENDER_GIT_COMMIT`).

## Configurar uma vez

### 1. Expo

1. Em [expo.dev](https://expo.dev) → **Account settings → Access tokens → Create token**.
2. No GitHub: **Settings → Secrets and variables → Actions → New repository secret**: `EXPO_TOKEN` = o token.

### 2. Render

O `render.yaml` tem `autoDeployTrigger: "off"`: o Render não sobe nada sozinho no push, só pelo GitHub Actions depois dos testes. Depois de mudar o arquivo, aplique o Blueprint de novo no Render (**Blueprints → miaucha → Sync**).

Para cada serviço, pegue o **deploy hook**: serviço no Render → **Settings → Deploy Hook** → copiar. Ele é um segredo (quem tem a URL dispara deploys); se vazar, gere outro no mesmo lugar.

Dois serviços separados é o ideal (um erro em dev não derruba a API usada na apresentação):

- `miaucha-api` (prod): o que já existe.
- `miaucha-api-dev` (dev): **New → Web Service**, mesmo repositório, mesmos comandos de build e start do `render.yaml`, mesmas variáveis. Pode usar o mesmo Supabase; o ideal é outro projeto do Supabase para não misturar dados de teste.

Com um serviço só, deixe o `RENDER_DEPLOY_HOOK_URL` só no ambiente `prod`: em dev o passo da API é pulado (aviso no log) e o app é publicado apontando para a mesma API.

### 3. Ambientes do GitHub

**Settings → Environments → New environment**, um para `dev` e outro para `prod`:

| Ambiente | Secret `RENDER_DEPLOY_HOOK_URL` | Variável `API_URL` | Variável `EAS_CHANNEL` |
| --- | --- | --- | --- |
| `dev` | hook do `miaucha-api-dev` (ou vazio) | `https://miaucha-api-dev.onrender.com` (ou a de prod) | `preview` |
| `prod` | hook do `miaucha-api` | `https://miaucha-api.onrender.com` | `production` |

Nos dois ambientes, crie também a variável `GOOGLE_WEB_CLIENT_ID` com o Client ID Web do Google (o mesmo do `eas.json`). Sem ela, o botão "Continuar com Google" some no app depois da atualização.

Em `prod`, ligue **Required reviewers**: o deploy espera alguém aprovar no GitHub antes de subir.

### 4. Builds

Gere um APK de cada perfil uma vez (os builds antigos, sem `expo-updates`, não recebem atualizações):

```bash
cd apps/mobile
npx eas-cli build -p android --profile preview      # dev (testes)
npx eas-cli build -p android --profile production   # prod
```

Os builds leem o endereço da API do `env` de cada perfil no `eas.json`. Se criar a API dev, troque o `EXPO_PUBLIC_API_URL` dos perfis `development` e `preview` para o endereço dela.

## Quando precisa de build novo

O `runtimeVersion` usa a política `fingerprint`: muda sozinho quando algo nativo muda (pacote com código nativo, `app.json`, ícone, plugins). Uma atualização só chega a builds com o mesmo runtime:

- Mudou só TypeScript/telas → o `deploy.yml` basta.
- Mudou algo nativo → gere um build novo (`eas-build.yml` ou o comando acima) e instale.

O perfil `development` (dev client) carrega o JS do Metro local e não usa o EAS Update.
