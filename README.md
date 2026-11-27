# Miaucha

App para reencontrar pets perdidos. Plano completo em [Miaucha — Plano de Execução.md](Miaucha%20—%20Plano%20de%20Execução.md); protótipo visual em [docs/design/design.tsx](docs/design/design.tsx).

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `apps/mobile` | App Expo (SDK 58) com Expo Router, NativeWind e fonte Plus Jakarta Sans |
| `packages/shared` | Tokens de cor, tipos e regras compartilhadas entre app e API |
| `apps/api` | API NestJS (ainda não criada) |

## Comandos

```bash
pnpm install            # na raiz
pnpm test               # todos os testes (shared + mobile)
pnpm typecheck

cd apps/mobile
npx expo start          # servidor de desenvolvimento
npx expo install <pkg>  # sempre use este para adicionar pacotes ao app
```

## Como trabalhamos (TDD)

1. Escreva o teste e rode: ele precisa falhar pelo motivo certo.
2. Escreva o mínimo de código para passar.
3. Refatore com os testes verdes.

Lógica pura fica em `packages/shared` ou em arquivos `.ts` testáveis (ex.: `apps/mobile/src/features/auth/session.ts`); as rotas em `src/app` só ligam peças já testadas.

Notas do ambiente:
- Testes do app usam RNTL 14, em que `render`, `fireEvent` e `act` são assíncronos (`await render(...)`).
- Enquanto a API não existe, o app usa `createMockAuthClient()`: qualquer código de 6 dígitos é aceito e a senha `errada123` simula erro de login.
