import { GMAIL_SEND_SCOPE, GMAIL_TOKEN_URL } from "./gmail-mailer";

/** Cliente OAuth do tipo "App para computador": o Google aceita voltar para o localhost. */
export const GMAIL_REDIRECT_URI = "http://localhost";

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Link de autorização: só o envio (gmail.send), offline e com consentimento (senão o refresh token não vem). */
export function buildGmailAuthUrl(clientId: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: GMAIL_REDIRECT_URI,
    response_type: "code",
    scope: GMAIL_SEND_SCOPE,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

/** Lê o código do endereço colado da barra do navegador (ou o código sozinho). */
export function extractAuthCode(input: string): { code: string } | { error: string } {
  const text = input.trim();
  if (!text) return { error: "vazio" };
  if (!/^https?:\/\//.test(text)) return { code: text };
  const params = new URL(text).searchParams;
  const error = params.get("error");
  if (error) return { error };
  const code = params.get("code");
  return code ? { code } : { error: "sem código no endereço" };
}

export async function exchangeGmailCode({
  clientId,
  clientSecret,
  code,
  fetch = globalThis.fetch as unknown as FetchLike,
}: {
  clientId: string;
  clientSecret: string;
  code: string;
  fetch?: FetchLike;
}): Promise<string> {
  const response = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: GMAIL_REDIRECT_URI, grant_type: "authorization_code" }).toString(),
  });
  const body = (await response.json().catch(() => null)) as { refresh_token?: string; error?: string; error_description?: string } | null;
  if (!response.ok) throw new Error(`O Google recusou o código: ${body?.error ?? response.status} ${body?.error_description ?? ""}`.trim());
  if (!body?.refresh_token) {
    throw new Error("O Google não devolveu o refresh token. Remova o acesso do app em myaccount.google.com/permissions e autorize de novo.");
  }
  return body.refresh_token;
}
