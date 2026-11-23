/**
 * Gera o GMAIL_REFRESH_TOKEN (uma vez só). Uso: `pnpm gmail:authorize` em apps/api,
 * com GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no .env. Passo a passo: docs/DEPLOY-RENDER.md.
 */
import { createInterface } from "node:readline/promises";
import { buildGmailAuthUrl, exchangeGmailCode, extractAuthCode } from "../src/mail/gmail-oauth";

async function main() {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("Coloque GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET no apps/api/.env antes de rodar este comando.");
    process.exit(1);
  }

  console.log("\n1. Abra este link no navegador e entre com a conta Gmail que vai enviar os e-mails:\n");
  console.log(buildGmailAuthUrl(clientId));
  console.log('\n2. Se aparecer "O Google não verificou este app", clique em "Avançado" e continue (o app é de vocês).');
  console.log('3. Depois de autorizar, o navegador vai para "localhost" e a página NÃO abre: isso é esperado.');
  console.log("   Copie o endereço inteiro da barra do navegador e cole aqui.\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question("Endereço (ou só o código): ");
  rl.close();

  const parsed = extractAuthCode(answer);
  if ("error" in parsed) {
    console.error(`\nNão deu certo: ${parsed.error}. Rode o comando de novo.`);
    process.exit(1);
  }
  try {
    const refreshToken = await exchangeGmailCode({ clientId, clientSecret, code: parsed.code });
    console.log("\nPronto. Coloque esta linha no apps/api/.env e a mesma variável no painel do Render (não envie por chat):\n");
    console.log(`GMAIL_REFRESH_TOKEN=${refreshToken}\n`);
  } catch (error) {
    console.error(`\n${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

void main();
