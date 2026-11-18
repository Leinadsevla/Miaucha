import { Logger } from "@nestjs/common";

export interface Mailer {
  sendEmailCode(to: string, code: string): Promise<void>;
}

/**
 * Enquanto o provedor de e-mail não é escolhido (Resend, SMTP...), o código sai no log.
 * Só para desenvolvimento: nunca use em produção.
 */
export class ConsoleMailer implements Mailer {
  private readonly logger = new Logger("Mailer");

  async sendEmailCode(to: string, code: string) {
    this.logger.log(`Código de verificação para ${to}: ${code}`);
  }
}
