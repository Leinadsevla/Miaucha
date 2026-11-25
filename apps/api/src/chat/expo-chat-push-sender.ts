import type { Pool } from "pg";
import type { PushSender } from "../alerts/push-sender";
import type { ChatPushNotification, ChatPushSender } from "./push-sender";

/**
 * Push de mensagem nova (CH-04) pelo Expo Push, com os tokens registrados pela S5 (`push_tokens`).
 * O `data.conversationId` faz o toque na notificação abrir a conversa.
 */
export class ExpoChatPushSender implements ChatPushSender {
  constructor(
    private readonly pool: Pool,
    private readonly expo: PushSender,
  ) {}

  async send({ userId, title, body, data }: ChatPushNotification): Promise<void> {
    const { rows } = await this.pool.query<{ token: string }>("select token from push_tokens where user_id = $1 order by updated_at", [
      userId,
    ]);
    if (rows.length === 0) return;
    const { invalidTokens } = await this.expo.send(rows.map(({ token }) => ({ to: token, title, body, data: { ...data } })));
    if (invalidTokens.length > 0) await this.pool.query("delete from push_tokens where token = any($1::text[])", [invalidTokens]);
  }
}
