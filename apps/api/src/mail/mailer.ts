import { Logger } from "@nestjs/common";

export type CodePurpose = "verify" | "reset";

export interface Mailer {
  sendEmailCode(to: string, code: string, purpose?: CodePurpose): Promise<void>;
}

/**
 * Enquanto o provedor de e-mail não é escolhido (Resend, SMTP...), o código sai no log.
 * Só para desenvolvimento: nunca use em produção.
 */
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger("Mailer");

  async sendEmailCode(to: string, code: string, purpose: CodePurpose = "verify") {
    const what = purpose === "reset" ? "troca de senha" : "verificação";
    this.logger.log(`Código de ${what} para ${to}: ${code}`);
  }
}
