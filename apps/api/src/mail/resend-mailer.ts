import { Logger, ServiceUnavailableException } from "@nestjs/common";
import { emailCodeContent } from "./email-content";
import type { CodePurpose, Mailer } from "./mailer";

export const RESEND_API_URL = "https://api.resend.com/emails";

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Options = { apiKey: string; from: string; fetch?: FetchLike; log?: (message: string) => void };

const FAILED = "Não foi possível enviar o e-mail com o código. Tente de novo em instantes.";


/** Códigos de verificação e de troca de senha pela API HTTP do Resend. */
export class ResendMailer implements Mailer {
  private readonly fetch: FetchLike;
  private readonly log: (message: string) => void;

  constructor(private readonly options: Options) {
    this.fetch = options.fetch ?? (globalThis.fetch as unknown as FetchLike);
    const logger = new Logger("ResendMailer");
    this.log = options.log ?? ((m) => logger.error(m));
  }

  async sendEmailCode(to: string, code: string, purpose: CodePurpose = "verify"): Promise<void> {
    const { subject, text, html } = emailCodeContent(code, purpose);
    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await this.fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.options.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.options.from, to: [to], subject, text, html }),
      });
    } catch (error) {
      this.log(`Resend inacessível: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException(FAILED);
    }
    if (!response.ok) {
      // Nunca registra o código; a mensagem do Resend explica o motivo (ex.: domínio de teste, limite diário).
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      this.log(`Resend recusou o envio (${response.status}): ${body?.message ?? "sem detalhes"}`);
      throw new ServiceUnavailableException(FAILED);
    }
  }
}
