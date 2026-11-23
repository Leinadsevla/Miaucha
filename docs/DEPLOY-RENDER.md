# Publicar a API no Render (plano gratuito)

O banco e as fotos já estão no Supabase. O Render hospeda só a API (`apps/api`). A configuração está no `render.yaml` da raiz.

## Antes de começar

- Uma conta no [Render](https://render.com) entrando com o GitHub de quem tem acesso ao repositório.
- O `apps/api/.env` local funcionando (os mesmos valores vão para o Render).
- **Branch:** a branch padrão do repositório (`s1/fundacao`) ainda não tem a API. Até os PRs serem mergeados, publique a partir da branch mais nova da fila (hoje `feat/ajustes-teste-2`). Depois do merge, troque para a branch principal em Settings → Build & Deploy.

## Passo a passo

1. No Render: **New → Blueprint** e escolha o repositório `Miaucha`, na branch do item acima. O Render lê o `render.yaml` e mostra o serviço `miaucha-api` (plano Free, região Oregon, perto do Supabase).
2. Preencha as variáveis marcadas como "sync: false", copiando do `apps/api/.env`:

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | A mesma do `.env`: URL do Session pooler do Supabase, terminando em `?sslmode=verify-full&sslrootcert=certs/supabase-ca.crt` |
   | `STORAGE_ENDPOINT`, `STORAGE_REGION` | Os mesmos do `.env` |
   | `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | As chaves S3 do Supabase Storage |
   | `GOOGLE_CLIENT_IDS`, `EXPO_ACCESS_TOKEN` | Podem ficar vazias por enquanto |

   `JWT_SECRET` e `CODE_SECRET` são gerados pelo Render; `TRUST_PROXY=1` e `NODE_VERSION=24` já vêm no arquivo.
3. Clique em **Apply**. O primeiro deploy leva alguns minutos. Nos **Logs**, espere a linha `Nest application successfully started`. As migrações rodam sozinhas a cada início.
4. Teste no navegador: `https://<nome-do-serviço>.onrender.com/health` deve responder `{"status":"ok"}`. Se o nome `miaucha-api` já estiver em uso no Render, o endereço ganha um sufixo; use o que aparece no topo da página do serviço.

## Apontar o app para a API publicada

Em `apps/mobile/.env.local`:

```
EXPO_PUBLIC_API_URL=https://<nome-do-serviço>.onrender.com
```

Depois reinicie o Expo com `npx expo start --tunnel ngrok --clear` (a variável só é lida ao montar o bundle). Com isso não é mais preciso deixar a porta 3000 do Codespace pública.

## O que saber sobre o plano gratuito

- **Dorme depois de 15 minutos sem uso.** O primeiro acesso depois disso demora para acordar (até cerca de 1 minuto) e o app pode mostrar erro de conexão: é só tentar de novo. Conexões do chat (WebSocket) mantêm o serviço acordado.
- **Alertas em andamento se perdem se o serviço dormir no meio do disparo** (a fila é dentro do processo; ver a pendência do BullMQ em `PROXIMOS-PASSOS.md`).
- **750 horas por mês** por conta: dá para um serviço ligado o mês todo. Se acabar, o serviço fica suspenso até o mês seguinte.
- O disco é apagado a cada reinício. A API não guarda nada em disco (banco e fotos estão no Supabase).

## Importante: e-mail

Ainda não há provedor de e-mail. **Os códigos de verificação e de troca de senha aparecem só nos Logs do Render** (`Código de verificação para ...`). Para testes do grupo isso serve; para outras pessoas usarem o app, é preciso implementar o `Mailer` com um provedor (ex.: Resend, que tem plano gratuito).

## Conferência rápida depois do deploy

```bash
curl https://<nome-do-serviço>.onrender.com/health          # {"status":"ok"}
curl -i https://<nome-do-serviço>.onrender.com/me/pets       # 401 (exige login)
```

Os comandos de build e start do `render.yaml` foram testados num clone limpo do repositório, com Postgres em Docker e sem `.env` (só as variáveis acima): a API subiu, aplicou as migrações e respondeu no `/health`.
