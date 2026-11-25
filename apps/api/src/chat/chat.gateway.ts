import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { type OnGatewayInit, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import type { Namespace, Socket } from "socket.io";

/** Eventos que o servidor envia (o cliente não envia nada pelo socket: mensagens vão por HTTP). */
export type ChatServerEvents = {
  "message:new": { conversationId: string; message: ChatMessage };
  /** A outra pessoa leu as mensagens enviadas até `readAt`. */
  "message:read": { conversationId: string; readAt: string };
  /** Contato liberado, bloqueio etc.: a conversa já na visão de quem recebe. */
  "conversation:updated": { conversation: ChatConversation };
};

const room = (userId: string) => `user:${userId}`;

/**
 * Socket.IO no namespace `/chat` (CH-03). Autentica pelo access token no handshake (`auth: { token }`);
 * cada socket entra na sala do seu usuário. O socket cai quando o token expira, e o app reconecta com
 * o token renovado. Com mais de uma instância, o adapter do Redis (`redis-io-adapter.ts`) faz as salas
 * e o `isOnline` valerem entre elas.
 */
@WebSocketGateway({ namespace: "chat" })
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer() private server!: Namespace;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(private readonly jwt: JwtService) {}

  afterInit(namespace: Namespace) {
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        () => next(),
        () => next(new Error("unauthorized")),
      );
    });
  }

  private async authenticate(socket: Socket) {
    const token: unknown = socket.handshake.auth?.token;
    if (typeof token !== "string" || !token) throw new Error("sem token");
    const payload = await this.jwt.verifyAsync<{ sub?: unknown; exp?: number }>(token, { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") throw new Error("sub ausente");
    await socket.join(room(payload.sub));

    if (payload.exp) {
      const timer = setTimeout(() => socket.disconnect(true), Math.max(0, payload.exp * 1000 - Date.now()));
      timer.unref();
      socket.once("disconnect", () => clearTimeout(timer));
    }
  }

  emitTo<E extends keyof ChatServerEvents>(userId: string, event: E, payload: ChatServerEvents[E]) {
    this.server.to(room(userId)).emit(event, payload);
  }

  /** Se o usuário tem algum socket conectado (em qualquer instância, com o adapter do Redis). */
  async isOnline(userId: string): Promise<boolean> {
    try {
      return (await this.server.in(room(userId)).fetchSockets()).length > 0;
    } catch (error) {
      // Sem resposta das outras instâncias: melhor um push a mais do que uma mensagem sem aviso.
      this.logger.warn(`Não foi possível ver quem está conectado: ${String(error)}`);
      return false;
    }
  }
}
