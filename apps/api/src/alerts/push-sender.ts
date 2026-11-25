/** Uma notificação para um aparelho. `data` chega ao app (AL-08: `occurrenceId` abre o detalhe). */
export type PushMessage = { to: string; title: string; body: string; data: Record<string, string> };

export type PushResult = {
  /** Tokens que o serviço disse não existirem mais (app desinstalado): podem ser apagados. */
  invalidTokens: string[];
};

/** Envio de push. A implementação real usa o Expo Push; os testes usam uma falsa. */
export interface PushSender {
  send(messages: PushMessage[]): Promise<PushResult>;
}

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Limite de mensagens por requisição da API do Expo. */
const BATCH_SIZE = 100;
/** Canal Android criado pelo app (`features/alerts/push.ts`). */
export const ALERT_CHANNEL_ID = "alerts";

type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

type Ticket = { status?: string; details?: { error?: string } };

/**
 * Expo Push pela API HTTP. Só lê os tickets imediatos (DeviceNotRegistered); os recibos
 * (`/push/getReceipts`) ficam para quando houver um job agendado (ver docs/PROXIMOS-PASSOS.md).
 */
export class ExpoPushSender implements PushSender {
  private readonly fetch: FetchLike;
  private readonly accessToken?: string;
  private readonly log: (message: string, error?: unknown) => void;

  constructor({
    fetch = globalThis.fetch as unknown as FetchLike,
    accessToken,
    log = (message, error) => console.error(`[push] ${message}`, error ?? ""),
  }: { fetch?: FetchLike; accessToken?: string; log?: (message: string, error?: unknown) => void } = {}) {
    this.fetch = fetch;
    this.accessToken = accessToken;
    this.log = log;
  }

  async send(messages: PushMessage[]): Promise<PushResult> {
    const invalidTokens: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
      if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
      try {
        const response = await this.fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers,
          body: JSON.stringify(batch.map((m) => ({ ...m, sound: "default", channelId: ALERT_CHANNEL_ID, priority: "high" }))),
        });
        if (!response.ok) {
          this.log(`Expo Push respondeu ${response.status}`);
          continue;
        }
        const body = (await response.json()) as { data?: Ticket[] };
        (body.data ?? []).forEach((ticket, index) => {
          if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" && batch[index]) {
            invalidTokens.push(batch[index].to);
          }
        });
      } catch (error) {
        this.log("Falha ao falar com o Expo Push", error);
      }
    }
    return { invalidTokens };
  }
}
