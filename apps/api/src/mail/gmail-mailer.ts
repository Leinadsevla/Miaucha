import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { emailCodeContent } from "./email-content";
import type { CodePurpose, Mailer } from "./mailer";

export const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
/** Escopo mínimo: só enviar (não lê nem apaga e-mails da conta). */
export const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export type GmailCredentials = { clientId: string; clientSecret: string; refreshToken: string; sender: string };
type Options = GmailCredentials & { fetch?: FetchLike; log?: (message: string) => void; senderName?: string };

const FAILED = "Não foi possível enviar o e-mail com o código. Tente de novo em instantes.";
/** Renova o acesso um pouco antes de expirar. */
const EXPIRY_MARGIN_MS = 60_000;

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
/** Quebra o base64 em linhas de 76 caracteres (RFC 2045). */
const wrap = (s: string) => s.match(/.{1,76}/g)?.join("\r\n") ?? "";

/** Mensagem RFC 2822 com versões texto e HTML; assunto acentuado codificado (RFC 2047). */
export function buildMimeMessage({ from, to, subject, text, html }: { from: string; to: string; subject: string; text: string; html: string }) {
  const boundary = `miaucha-${randomBytes(12).toString("hex")}`;
  const part = (type: string, body: string) =>
    [`--${boundary}`, `Content-Type: ${type}; charset="UTF-8"`, "Content-Transfer-Encoding: base64", "", wrap(b64(body))].join("\r\n");
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${b64(subject)}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    part("text/plain", text),
    part("text/html", html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

/**
 * Envia os códigos pela API do Gmail (HTTPS, porta 443: funciona no plano grátis do Render, que bloqueia SMTP).
 * Usa o refresh token gerado uma vez com `pnpm gmail:authorize`.
 */
export class GmailApiMailer implements Mailer {
  private readonly fetch: FetchLike;
  private readonly log: (message: string) => void;
  private access: { token: string; expiresAt: number } | null = null;

  constructor(private readonly options: Options) {
    this.fetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
    const logger = new Logger("GmailApiMailer");
    this.log = options.log ?? ((m) => logger.error(m));
  }

  async sendEmailCode(to: string, code: string, purpose: CodePurpose = "verify"): Promise<void> {
    const { subject, text, html } = emailCodeContent(code, purpose);
    const from = `${this.options.senderName ?? "Miaucha"} <${this.options.sender}>`;
    const raw = Buffer.from(buildMimeMessage({ from, to, subject, text, html }), "utf8").toString("base64url");
    try {
      const token = await this.accessToken();
      const response = await this.fetch(GMAIL_SEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      if (!response.ok) {
        // Nunca registra o código; a mensagem do Google diz o motivo (limite diário, conta bloqueada...).
        const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
        this.log(`Gmail recusou o envio (${response.status}): ${body?.error?.message ?? "sem detalhes"}`);
        throw new ServiceUnavailableException(FAILED);
      }
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.log(`Gmail inacessível: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException(FAILED);
    }
  }

  private async accessToken(): Promise<string> {
    if (this.access && this.access.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return this.access.token;
    const response = await this.fetch(GMAIL_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    });
    const body = (await response.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string; error_description?: string } | null;
    if (!response.ok || !body?.access_token) {
      // A dica depende do erro: client errado se corrige nas variáveis; autorização revogada, gerando outro refresh token.
      const hint =
        body?.error === "invalid_client" || body?.error === "unauthorized_client"
          ? "Confira GMAIL_CLIENT_ID e GMAIL_CLIENT_SECRET (devem ser iguais aos do cliente OAuth no Google Cloud)."
          : "Se a autorização expirou ou foi revogada, rode `pnpm gmail:authorize` de novo e atualize GMAIL_REFRESH_TOKEN.";
      this.log(`Não foi possível renovar o acesso ao Gmail (${response.status} ${body?.error ?? ""}: ${body?.error_description ?? ""}). ${hint}`);
      throw new ServiceUnavailableException(FAILED);
    }
    this.access = { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
    return this.access.token;
  }
}
