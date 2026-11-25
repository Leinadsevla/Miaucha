import type { StoredSession } from "@/features/auth/sessionStorage";
import { createChatRealtime, type ChatSocket, type SocketOptions } from "../chatRealtime";

/** Socket falso: o teste dispara os eventos do servidor com `fire`. */
class FakeSocket implements ChatSocket {
  active = false;
  connectCalls = 0;
  disconnected = false;
  handlers = new Map<string, ((...args: never[]) => void)[]>();

  constructor(
    readonly url: string,
    readonly options: SocketOptions,
  ) {}

  on(event: string, handler: (...args: never[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }

  connect() {
    this.connectCalls++;
    this.active = true;
    return this;
  }

  disconnect() {
    this.disconnected = true;
    this.active = false;
    return this;
  }

  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) (handler as (...a: unknown[]) => void)(...args);
  }

  /** Token que o adaptador entregaria no próximo handshake. */
  token(): Promise<unknown> {
    return new Promise((resolve) => (this.options.auth as (cb: (data: unknown) => void) => void)(resolve));
  }
}

const session = (accessToken: string): StoredSession => ({ accessToken, refreshToken: "r", user: { id: "u1", name: "Ana", hasConsent: true } });

function setup({ refreshTo = "novo" as string | null } = {}) {
  let current: StoredSession | null = session("velho");
  const sockets: FakeSocket[] = [];
  const refreshSession = jest.fn(async () => {
    if (refreshTo === null) return null;
    current = session(refreshTo);
    return current;
  });
  const realtime = createChatRealtime({
    url: "https://api.teste/",
    session: { storage: { load: async () => current, save: async () => {}, clear: async () => {} }, refreshSession },
    connect: (url, options) => {
      const socket = new FakeSocket(url, options);
      sockets.push(socket);
      return socket;
    },
    retryDelayMs: 10,
  });
  return { realtime, sockets, refreshSession };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("createChatRealtime", () => {
  it("conecta no namespace /chat só por websocket, com reconexão, e manda o access token salvo", async () => {
    const { realtime, sockets } = setup();
    realtime.start();
    expect(sockets).toHaveLength(1);
    expect(sockets[0].url).toBe("https://api.teste/chat");
    expect(sockets[0].options).toMatchObject({ transports: ["websocket"], reconnection: true, autoConnect: false });
    expect(sockets[0].connectCalls).toBe(1);
    expect(await sockets[0].token()).toEqual({ token: "velho" });

    realtime.start();
    expect(sockets).toHaveLength(1);
  });

  it("repassa os eventos do servidor a quem assinou, até cancelar", async () => {
    const { realtime, sockets } = setup();
    const received: unknown[] = [];
    const off = realtime.on("message:new", (event) => received.push(event));
    realtime.start();
    sockets[0].fire("message:new", { conversationId: "c1" });
    off();
    sockets[0].fire("message:new", { conversationId: "c2" });
    expect(received).toEqual([{ conversationId: "c1" }]);
  });

  it("avisa quando (re)conecta, para a tela buscar o que perdeu", async () => {
    const { realtime, sockets } = setup();
    const onConnect = jest.fn();
    realtime.onConnect(onConnect);
    realtime.start();
    sockets[0].fire("connect");
    sockets[0].fire("connect");
    expect(onConnect).toHaveBeenCalledTimes(2);
  });

  it("token recusado: renova a sessão e tenta de novo com o token novo", async () => {
    const { realtime, sockets, refreshSession } = setup();
    realtime.start();
    await sockets[0].token(); // handshake recusado
    sockets[0].active = false;
    sockets[0].fire("connect_error", new Error("unauthorized"));
    await flush();
    expect(refreshSession).toHaveBeenCalledWith("velho");
    expect(sockets[0].connectCalls).toBe(2);
    expect(await sockets[0].token()).toEqual({ token: "novo" });
  });

  it("sessão expirada de vez: para de tentar", async () => {
    const { realtime, sockets } = setup({ refreshTo: null });
    realtime.start();
    sockets[0].active = false;
    sockets[0].fire("connect_error", new Error("unauthorized"));
    await flush();
    expect(sockets[0].connectCalls).toBe(1);
  });

  it("servidor derrubou (token expirou): reconecta", async () => {
    const { realtime, sockets } = setup();
    realtime.start();
    sockets[0].active = false;
    sockets[0].fire("disconnect", "io server disconnect");
    expect(sockets[0].connectCalls).toBe(2);
  });

  it("erro de rede sem reconexão automática: tenta de novo depois de um tempo", async () => {
    const { realtime, sockets } = setup();
    realtime.start();
    sockets[0].active = false;
    sockets[0].fire("connect_error", new Error("timeout"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sockets[0].connectCalls).toBe(2);
  });

  it("erro de rede com a reconexão automática ativa: deixa o socket.io cuidar", async () => {
    const { realtime, sockets } = setup();
    realtime.start();
    sockets[0].fire("connect_error", new Error("xhr poll error"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sockets[0].connectCalls).toBe(1);
  });

  it("stop desconecta e não reconecta mais", async () => {
    const { realtime, sockets } = setup();
    realtime.start();
    realtime.stop();
    expect(sockets[0].disconnected).toBe(true);
    sockets[0].fire("disconnect", "io server disconnect");
    sockets[0].fire("connect_error", new Error("timeout"));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(sockets[0].connectCalls).toBe(1);
    realtime.start();
    expect(sockets[0].connectCalls).toBe(2);
  });
});
