# Publicar a API no Render (plano gratuito)

O banco e as fotos já estão no Supabase. O Render hospeda só a API (`apps/api`). A configuração está no `render.yaml` da raiz.

## Antes de começar

- Uma conta no [Render](https://render.com) entrando com o GitHub de quem tem acesso ao repositório.
- O `apps/api/.env` local funcionando (os mesmos valores vão para o Render).
- **Branch:** `s1/fundacao` (a principal, definida em `branch` no `render.yaml`). Cada merge nela publica a API. Para trocar, mude o `render.yaml` e sincronize o Blueprint, ou use Settings → Build & Deploy.

## Passo a passo

1. No Render: **New → Blueprint** e escolha o repositório `Miaucha`, na branch do item acima. O Render lê o `render.yaml` e mostra o serviço `miaucha-api` (plano Free, região Oregon, perto do Supabase).
2. Preencha as variáveis marcadas como "sync: false", copiando do `apps/api/.env`:

   | Variável | Valor |
   | --- | --- |
   | `DATABASE_URL` | A mesma do `.env`: URL do Session pooler do Supabase, terminando em `?sslmode=verify-full&sslrootcert=certs/supabase-ca.crt` |
   | `STORAGE_ENDPOINT`, `STORAGE_REGION` | Os mesmos do `.env` |
   | `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | As chaves S3 do Supabase Storage |
   | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` | E-mail dos códigos pela API do Gmail (ver "E-mail" abaixo) |
   | `RESEND_API_KEY`, `MAIL_FROM` | Alternativa ao Gmail; vazias = códigos só nos Logs |
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

## E-mail dos códigos pela API do Gmail (recomendado)

Os códigos saem de uma conta Gmail do projeto para qualquer pessoa, sem domínio próprio. A API usa a **API do Gmail por HTTPS**: o plano grátis do Render bloqueia as portas de SMTP, então SMTP não funcionaria lá. Limite de uma conta Gmail pessoal: cerca de 500 e-mails por dia.

Use uma conta Gmail **só do projeto** (ex.: `projeto.miaucha@gmail.com`), não a pessoal de alguém.

### 1. Google Cloud (uma vez)

1. Em [console.cloud.google.com](https://console.cloud.google.com), crie um projeto (ex.: "Miaucha"), logado com a conta do projeto.
2. **APIs e serviços → Biblioteca**: procure **Gmail API** e clique em **Ativar**.
3. **Google Auth Platform** (ou "Tela de permissão OAuth"):
   - **Branding:** nome do app "Miaucha" e o e-mail de suporte.
   - **Público-alvo (Audience):** "Externo". Depois clique em **Publicar app** para o status ficar **"Em produção"**. Em "Teste", a autorização expira a cada 7 dias e os e-mails param.
   - **Acesso a dados (Data access):** adicione o escopo `https://www.googleapis.com/auth/gmail.send` (só enviar; não lê nem apaga e-mails).
4. **Clientes (Credenciais) → Criar cliente → tipo "App para computador"**. Copie o **ID do cliente** e a **chave secreta do cliente**.

### 2. Gerar o refresh token (uma vez)

No `apps/api/.env`, preencha:

```
GMAIL_CLIENT_ID=<ID do cliente>
GMAIL_CLIENT_SECRET=<chave secreta>
GMAIL_SENDER=projeto.miaucha@gmail.com
```

E rode:

```bash
cd apps/api && pnpm gmail:authorize
```

O comando mostra um link. Abra, entre com a **conta do projeto** e autorize. O Google vai avisar que "não verificou este app": clique em **Avançado → Acessar Miaucha** (o app é de vocês). No fim, o navegador vai para `localhost` e a página **não abre**; isso é esperado. Copie o endereço inteiro da barra e cole no terminal. Ele mostra a linha `GMAIL_REFRESH_TOKEN=...` para colar no `.env`.

### 3. Render

Preencha as quatro variáveis (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER`) com os mesmos valores. Elas precisam vir juntas: se faltar alguma, a API não sobe e o log diz qual está faltando.

Se um dia os códigos pararem de chegar e o log disser "Não foi possível renovar o acesso ao Gmail", a autorização foi revogada (ex.: senha da conta trocada). Rode `pnpm gmail:authorize` de novo e atualize `GMAIL_REFRESH_TOKEN`.

## Alternativa: e-mail pelo Resend

A API manda os códigos de verificação e de troca de senha pelo [Resend](https://resend.com) quando `RESEND_API_KEY` está configurada. Sem ela, os códigos aparecem só nos **Logs** do Render.

Plano gratuito: 100 e-mails por dia e 3.000 por mês, até 3 domínios.

1. Crie a conta no Resend e, em **API Keys**, gere uma chave com permissão "Sending access".
2. No Render, preencha `RESEND_API_KEY` com a chave e `MAIL_FROM` com `Miaucha <onboarding@resend.dev>`.
3. **Limite sem domínio próprio:** o remetente de teste `onboarding@resend.dev` **só entrega para o e-mail do dono da conta no Resend**. Para qualquer outro endereço, o Resend recusa e o app mostra "Não foi possível enviar o e-mail com o código" (o motivo aparece nos Logs).
4. **Para enviar a qualquer pessoa**, é preciso um domínio verificado: em **Domains → Add domain**, use um subdomínio (ex.: `mail.seudominio.com.br`) e crie no DNS os registros que o Resend mostrar (SPF e DKIM). Depois troque `MAIL_FROM` para um endereço desse domínio, ex.: `Miaucha <codigo@mail.seudominio.com.br>`. O Resend não dá domínio de graça: um `.com.br` custa por ano no Registro.br, e o GitHub Student Developer Pack costuma oferecer um domínio grátis por um ano (confira as ofertas atuais).

Se o envio falhar durante o cadastro, a API desfaz o cadastro (a pessoa pode tentar de novo, sem cair em "e-mail já cadastrado").

## Conferência rápida depois do deploy

```bash
curl https://<nome-do-serviço>.onrender.com/health          # {"status":"ok"}
curl -i https://<nome-do-serviço>.onrender.com/me/pets       # 401 (exige login)
```

Os comandos de build e start do `render.yaml` foram testados num clone limpo do repositório, com Postgres em Docker e sem `.env` (só as variáveis acima): a API subiu, aplicou as migrações e respondeu no `/health`.
