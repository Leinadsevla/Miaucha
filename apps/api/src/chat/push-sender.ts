import { Logger } from "@nestjs/common";

/** Token próprio do chat (o dos alertas é `PUSH_SENDER` em tokens.ts). */
export const CHAT_PUSH_SENDER = Symbol("CHAT_PUSH_SENDER");

/** Push de mensagem nova (CH-04). `userId` é o destinatário e só é usado aqui dentro, para achar os tokens dele. */
export type ChatPushNotification = {
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
export interface ChatPushSender {
  send(notification: ChatPushNotification): Promise<void>;
}

/** Só registra no log, sem o texto da mensagem (o log não é lugar de conversa privada). */
export class LogChatPushSender implements ChatPushSender {
  private readonly logger = new Logger("ChatPushSender");

  async send({ data }: ChatPushNotification): Promise<void> {
    this.logger.log(`Push de mensagem nova pendente (conversa ${data.conversationId}); envio real ainda não configurado`);
  }
}
