# Deploy do app (EAS)

Três workflows em `.github/workflows`:

| Workflow | Quando roda | O que faz |
| --- | --- | --- |
| `ci.yml` | Todo PR (e chamado pelos outros dois) | `pnpm typecheck` e `pnpm test` (inclui a integração da API, com Docker) |
| `eas-update.yml` | Push na `s1/fundacao` ou `main`, ou "Run workflow" | CI e depois `eas update --channel preview`: o JavaScript novo chega aos APKs do perfil `preview` na próxima vez que o app abrir |
| `eas-build.yml` | Tag `v*` (ex.: `git tag v1.1.0 && git push --tags`) ou "Run workflow" (escolhe o perfil) | CI e depois `eas build` Android na nuvem do Expo (`--no-wait`; o link sai no log e em expo.dev) |

## Configurar uma vez

1. Em [expo.dev](https://expo.dev) → **Account settings → Access tokens → Create token**. Copie o token.
2. No GitHub do repositório: **Settings → Secrets and variables → Actions → New repository secret**, nome `EXPO_TOKEN`, valor = o token.
3. Gere um APK novo do perfil `preview` (workflow "EAS Build" ou `npx eas-cli build -p android --profile preview`). Builds feitos antes do `expo-updates` não recebem atualizações.

## Quando precisa de build novo

O `runtimeVersion` usa a política `fingerprint`: muda sozinho quando algo nativo muda (pacote com código nativo, `app.json`, ícone, plugins). Uma atualização só é aplicada em builds com o mesmo runtime. Então:

- Mudou só TypeScript/telas → basta o merge (EAS Update).
- Mudou algo nativo → crie uma tag `v*` para gerar um APK novo e instale-o.

## Observações

- O `eas update` não lê o `env` do `eas.json`; por isso o workflow define `EXPO_PUBLIC_API_URL` no passo de publicação. Se o endereço da API mudar, mude nos dois lugares.
- O perfil `development` usa o Metro local e não depende do EAS Update.
