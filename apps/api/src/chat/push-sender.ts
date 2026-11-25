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

/** Envia push para quem não está conectado ao socket. Implementação: `ExpoChatPushSender` (tokens da S5). */
export interface ChatPushSender {
  send(notification: ChatPushNotification): Promise<void>;
}
