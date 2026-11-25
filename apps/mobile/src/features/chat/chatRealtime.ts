import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import type { ApiSession } from "@/features/auth/apiSession";

/** Eventos que a API envia no namespace `/chat` (o app não envia nada pelo socket: mensagens vão por HTTP). */
export type ChatEvents = {
  "message:new": { conversationId: string; message: ChatMessage };
  "message:read": { conversationId: string; readAt: string };
  "conversation:updated": { conversation: ChatConversation };
};

export type ChatEventName = keyof ChatEvents;

export type SocketOptions = {
  auth: (cb: (data: { token?: string }) => void) => void;
  transports: ["websocket"];
  reconnection: true;
  autoConnect: false;
};

/** Subconjunto do `Socket` do socket.io-client; injetável nos testes. */
export type ChatSocket = {
  /** Se o socket.io ainda vai reconectar sozinho. Fica falso quando o servidor recusa ou derruba. */
  active: boolean;
  on(event: string, handler: (...args: never[]) => void): unknown;
  connect(): unknown;
  disconnect(): unknown;
};

export type SocketFactory = (url: string, options: SocketOptions) => ChatSocket;

export type ChatRealtime = {
  /** Conecta (uma vez só; chamar de novo não abre outro socket). */
  start(): void;
  stop(): void;
  on<E extends ChatEventName>(event: E, handler: (payload: ChatEvents[E]) => void): () => void;
  /** Chamado a cada conexão: depois de cair, a tela busca de novo o que pode ter perdido. */
  onConnect(handler: () => void): () => void;
};

const EVENTS: ChatEventName[] = ["message:new", "message:read", "conversation:updated"];

/**
 * Tempo real do chat (CH-03). O socket.io reconecta sozinho quando a rede cai; os casos em que ele
 * desiste são tratados aqui: token recusado (renova a sessão pelo `ApiSession` e tenta de novo),
 * servidor derrubou a conexão (o token expirou) e erro de rede no primeiro handshake.
 */
export function createChatRealtime({
  url,
  session,
  connect,
  retryDelayMs = 3000,
}: {
  url: string;
  session: Pick<ApiSession, "storage" | "refreshSession">;
  connect: SocketFactory;
  retryDelayMs?: number;
}): ChatRealtime {
  const listeners = new Map<string, Set<(payload: never) => void>>();
  const connectListeners = new Set<() => void>();
  let socket: ChatSocket | undefined;
  let running = false;
  let lastToken: string | undefined;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const reconnect = () => {
    if (running) socket?.connect();
  };

  function create(): ChatSocket {
    const s = connect(`${url.replace(/\/+$/, "")}/chat`, {
      auth: (cb) => {
        session.storage.load().then(
          (stored) => {
            lastToken = stored?.accessToken;
            cb({ token: lastToken });
          },
          () => cb({}),
        );
      },
      transports: ["websocket"],
      reconnection: true,
      autoConnect: false,
    });
    for (const event of EVENTS) {
      s.on(event, ((payload: never) => listeners.get(event)?.forEach((handler) => handler(payload))) as (...args: never[]) => void);
    }
    s.on("connect", () => connectListeners.forEach((handler) => handler()));
    s.on("disconnect", ((reason: string) => {
      if (reason === "io server disconnect") reconnect();
    }) as (...args: never[]) => void);
    s.on("connect_error", ((error: Error) => {
      if (!running || s.active) return; // o socket.io vai tentar de novo sozinho
      if (error?.message === "unauthorized") {
        session.refreshSession(lastToken).then(
          (renewed) => {
            if (renewed) reconnect();
          },
          () => {
            retryTimer = setTimeout(reconnect, retryDelayMs);
          },
        );
      } else {
        retryTimer = setTimeout(reconnect, retryDelayMs);
      }
    }) as (...args: never[]) => void);
    return s;
  }

  return {
    start() {
      if (running) return;
      running = true;
      socket ??= create();
      socket.connect();
    },
    stop() {
      running = false;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.disconnect();
    },
    on(event, handler) {
      const set = listeners.get(event) ?? new Set();
      listeners.set(event, set);
      set.add(handler as (payload: never) => void);
      return () => set.delete(handler as (payload: never) => void);
    },
    onConnect(handler) {
      connectListeners.add(handler);
      return () => connectListeners.delete(handler);
    },
  };
}

/**
 * Tempo real em memória: sem API (modo de desenvolvimento) nada chega; nos testes, `emit` e `connected`
 * simulam o servidor.
 */
export function createLocalChatRealtime() {
  const listeners = new Map<string, Set<(payload: never) => void>>();
  const connectListeners = new Set<() => void>();
  const realtime = {
    started: false,
    start() {
      realtime.started = true;
    },
    stop() {
      realtime.started = false;
    },
    on<E extends ChatEventName>(event: E, handler: (payload: ChatEvents[E]) => void) {
      const set = listeners.get(event) ?? new Set();
      listeners.set(event, set);
      set.add(handler as (payload: never) => void);
      return () => void set.delete(handler as (payload: never) => void);
    },
    onConnect(handler: () => void) {
      connectListeners.add(handler);
      return () => void connectListeners.delete(handler);
    },
    emit<E extends ChatEventName>(event: E, payload: ChatEvents[E]) {
      listeners.get(event)?.forEach((handler) => (handler as (p: ChatEvents[E]) => void)(payload));
    },
    connected() {
      connectListeners.forEach((handler) => handler());
    },
  };
  return realtime satisfies ChatRealtime;
}
