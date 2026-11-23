import { Logger, ServiceUnavailableException } from "@nestjs/common";
import type { CodePurpose, Mailer } from "./mailer";

export const RESEND_API_URL = "https://api.resend.com/emails";

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Options = { apiKey: string; from: string; fetch?: FetchLike; log?: (message: string) => void };

const FAILED = "Não foi possível enviar o e-mail com o código. Tente de novo em instantes.";

function content(code: string, purpose: CodePurpose) {
  const reset = purpose === "reset";
  const subject = reset ? `Código para trocar sua senha no Miaucha: ${code}` : `Seu código do Miaucha: ${code}`;
  const intro = reset ? "Use este código para trocar sua senha no Miaucha:" : "Use este código para confirmar seu e-mail no Miaucha:";
  const outro = reset
    ? "Se não foi você que pediu para trocar a senha, ignore este e-mail: sua senha continua a mesma."
    : "Se não foi você que criou a conta, ignore este e-mail.";
  const text = `${intro}\n\n${code}\n\nO código vale por 10 minutos.\n\n${outro}`;
  const html = `<div style="font-family:Arial,sans-serif;color:#1F2430">
<p>${intro}</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#FF8A3D">${code}</p>
<p>O código vale por 10 minutos.</p>
<p style="color:#6B7280;font-size:13px">${outro}</p>
</div>`;
  return { subject, text, html };
}

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
    const { subject, text, html } = content(code, purpose);
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
