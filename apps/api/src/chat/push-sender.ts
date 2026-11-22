import { Logger } from "@nestjs/common";

export const PUSH_SENDER = Symbol("PUSH_SENDER");

/** Push de mensagem nova (CH-04). `userId` é o destinatário e só é usado aqui dentro, para achar os tokens dele. */
export type PushNotification = {
  userId: string;
  /** Pseudônimo de quem enviou. */
  title: string;
  /** Trecho da mensagem já mascarada (`chatPushPreview`). */
  body: string;
  data: { conversationId: string };
};

/**
 * Envia push para quem não está conectado ao socket. O Expo Push entra quando existir o registro dos
 * tokens de push (S5) e um development build; até lá fica o `LogPushSender`.
 */
export interface PushSender {
  send(notification: PushNotification): Promise<void>;
}

/** Só registra no log, sem o texto da mensagem (o log não é lugar de conversa privada). */
export class LogPushSender implements PushSender {
  private readonly logger = new Logger("PushSender");

  async send({ data }: PushNotification): Promise<void> {
    this.logger.log(`Push de mensagem nova pendente (conversa ${data.conversationId}); envio real ainda não configurado`);
  }
}
