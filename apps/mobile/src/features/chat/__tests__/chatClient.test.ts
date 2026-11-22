import { MASKED_PHONE, distanceMeters, type ChatConversation, type ChatMessage } from "@miaucha/shared";
import { createApiSession, type FetchLike } from "@/features/auth/apiSession";
import type { SessionStorage, StoredSession } from "@/features/auth/sessionStorage";
import type { Uploader } from "@/features/pets/petsClient";
import { createHttpChatClient, createMockChatClient } from "../chatClient";

type Call = { method: string; path: string; body: unknown };

function setup(routes: Record<string, (call: Call) => { status: number; body?: unknown }>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call = { method: init.method, path: url.replace("https://api.teste", ""), body: init.body ? JSON.parse(init.body) : undefined };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    if (!handler) throw new Error(`rota não esperada: ${call.method} ${call.path}`);
    const reply = handler(call);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
  };
  let current: StoredSession | null = { accessToken: "access", refreshToken: "refresh", user: { id: "u1", name: "Ana", hasConsent: true } };
  const storage: SessionStorage = { load: async () => current, save: async (s) => void (current = s), clear: async () => void (current = null) };
  const uploads: string[] = [];
  const upload: Uploader = async (url) => void uploads.push(url);
  const client = createHttpChatClient({ session: createApiSession({ baseUrl: "https://api.teste", storage, fetch }), upload });
  return { client, calls, uploads };
}

const conversation = { id: "c1" } as ChatConversation;
const message = { id: "m1" } as ChatMessage;

describe("createHttpChatClient", () => {
  it("usa as rotas da API do chat", async () => {
    const { client, calls } = setup({
      "POST /conversations": () => ({ status: 200, body: conversation }),
      "GET /conversations": () => ({ status: 200, body: [conversation] }),
      "GET /conversations/c1": () => ({ status: 200, body: conversation }),
      "GET /conversations/c1/messages": () => ({ status: 200, body: { messages: [message], nextCursor: "m1" } }),
      "GET /conversations/c1/messages?before=m1": () => ({ status: 200, body: { messages: [], nextCursor: null } }),
      "POST /conversations/c1/messages": () => ({ status: 201, body: message }),
      "POST /conversations/c1/read": () => ({ status: 204 }),
      "POST /conversations/c1/contact-consent": () => ({ status: 200, body: conversation }),
      "DELETE /conversations/c1/contact-consent": () => ({ status: 200, body: conversation }),
      "POST /conversations/c1/block": () => ({ status: 200, body: conversation }),
      "DELETE /conversations/c1/block": () => ({ status: 200, body: conversation }),
      "POST /conversations/c1/report": () => ({ status: 204 }),
    });

    expect(await client.start("o1")).toBe(conversation);
    expect(await client.list()).toEqual([conversation]);
    expect(await client.get("c1")).toBe(conversation);
    expect(await client.messages("c1")).toEqual({ messages: [message], nextCursor: "m1" });
    expect(await client.messages("c1", "m1")).toEqual({ messages: [], nextCursor: null });
    expect(await client.sendText("c1", "oi")).toBe(message);
    expect(await client.sendLocation("c1", { lat: -23.5, lng: -46.6 })).toBe(message);
    await client.markRead("c1");
    await client.setContactConsent("c1", true);
    await client.setContactConsent("c1", false);
    await client.setBlocked("c1", true);
    await client.setBlocked("c1", false);
    await client.report("c1", "scam", "Pediu dinheiro");

    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "POST /conversations",
      "GET /conversations",
      "GET /conversations/c1",
      "GET /conversations/c1/messages",
      "GET /conversations/c1/messages?before=m1",
      "POST /conversations/c1/messages",
      "POST /conversations/c1/messages",
      "POST /conversations/c1/read",
      "POST /conversations/c1/contact-consent",
      "DELETE /conversations/c1/contact-consent",
      "POST /conversations/c1/block",
      "DELETE /conversations/c1/block",
      "POST /conversations/c1/report",
    ]);
    expect(calls[0].body).toEqual({ occurrenceId: "o1" });
    expect(calls[5].body).toEqual({ text: "oi" });
    expect(calls[6].body).toEqual({ location: { lat: -23.5, lng: -46.6 } });
    expect(calls[12].body).toEqual({ reason: "scam", details: "Pediu dinheiro" });
  });

  it("foto: pede a URL, envia ao storage, confirma e manda a mensagem com o id da foto", async () => {
    const { client, calls, uploads } = setup({
      "POST /conversations/c1/photos": () => ({ status: 201, body: { photoId: "p1", uploadUrl: "https://storage/put" } }),
      "POST /conversations/c1/photos/p1/confirm": () => ({ status: 200, body: { id: "p1", url: "https://storage/get" } }),
      "POST /conversations/c1/messages": () => ({ status: 201, body: message }),
    });
    expect(await client.sendPhoto("c1", { uri: "file:///foto.jpg", mimeType: "image/jpeg" })).toBe(message);
    expect(uploads).toEqual(["https://storage/put"]);
    expect(calls.at(-1)?.body).toEqual({ photoId: "p1" });
  });

  it("foto em formato não aceito nem chega à API", async () => {
    const { client, calls } = setup({});
    await expect(client.sendPhoto("c1", { uri: "file:///doc.pdf", mimeType: "application/pdf" })).rejects.toThrow("Envie uma foto JPG, PNG ou WebP");
    expect(calls).toEqual([]);
  });
});

describe("createMockChatClient", () => {
  it("abre conversa idempotente, mascara o texto e manda localização aproximada", async () => {
    const client = createMockChatClient();
    const a = await client.start("o1");
    expect((await client.start("o1")).id).toBe(a.id);
    const sent = await client.sendText(a.id, "me liga 11 98765-4321");
    expect(sent).toMatchObject({ mine: true, text: `me liga ${MASKED_PHONE}` });
    const real = { lat: -23.5, lng: -46.6 };
    const location = await client.sendLocation(a.id, real);
    expect(distanceMeters(real, location.location!)).toBeGreaterThan(50);
    const page = await client.messages(a.id);
    expect(page.messages.map((m) => m.id)).toEqual([location.id, sent.id]);
    expect((await client.list())[0].lastMessage?.id).toBe(location.id);
  });

  it("opt-in de contato e bloqueio mudam a conversa", async () => {
    const client = createMockChatClient();
    const { id } = await client.start("o1");
    expect((await client.setContactConsent(id, true)).contact.mine).toBe(true);
    const blocked = await client.setBlocked(id, true);
    expect(blocked).toMatchObject({ blockedByMe: true, canSend: false });
    await expect(client.sendText(id, "oi")).rejects.toThrow("Não é possível enviar mensagens nesta conversa");
  });
});
