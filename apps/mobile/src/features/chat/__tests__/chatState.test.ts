import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import { applyIncoming, applyRead, catchUpMessages, formatMessageTime, lastMessagePreview, mergeMessages, upsertConversation } from "../chatState";

const msg = (id: string, createdAt: string, data: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversationId: "c1",
  mine: false,
  kind: "text",
  text: id,
  photoUrl: null,
  location: null,
  createdAt,
  readAt: null,
  ...data,
});

const conv = (id: string, data: Partial<ChatConversation> = {}): ChatConversation => ({
  id,
  occurrence: { id: `o-${id}`, type: "lost", species: "dog", petName: "Thor", status: "open", photoUrl: null },
  otherPseudonym: "Tutor Azul 1",
  iAmAuthor: false,
  lastMessage: null,
  unreadCount: 0,
  blockedByMe: false,
  canSend: true,
  contact: { mine: false, theirs: false, otherEmail: null },
  createdAt: "2026-11-20T10:00:00Z",
  ...data,
});

describe("mergeMessages", () => {
  it("junta páginas e mensagens novas, sem repetir, mais novas primeiro", () => {
    const current = [msg("m3", "2026-11-20T10:03:00Z"), msg("m2", "2026-11-20T10:02:00Z")];
    const merged = mergeMessages(current, [msg("m4", "2026-11-20T10:04:00Z"), msg("m2", "2026-11-20T10:02:00Z", { readAt: "x" }), msg("m1", "2026-11-20T10:01:00Z")]);
    expect(merged.map((m) => m.id)).toEqual(["m4", "m3", "m2", "m1"]);
    expect(merged[2].readAt).toBe("x");
  });
});

describe("applyRead", () => {
  it("marca como lidas as minhas enviadas até a hora da leitura", () => {
    const list = [
      msg("m3", "2026-11-20T10:03:00Z", { mine: true }),
      msg("m2", "2026-11-20T10:02:00Z", { mine: false }),
      msg("m1", "2026-11-20T10:01:00Z", { mine: true }),
    ];
    const read = applyRead(list, "2026-11-20T10:02:30Z");
    expect(read.map((m) => m.readAt)).toEqual([null, null, "2026-11-20T10:02:30Z"]);
  });
});

describe("applyIncoming (lista de conversas)", () => {
  it("atualiza a última mensagem, soma não lida e sobe a conversa", () => {
    const list = [conv("c2"), conv("c1")];
    const { list: next, known } = applyIncoming(list, { conversationId: "c1", message: msg("m1", "2026-11-20T11:00:00Z") });
    expect(known).toBe(true);
    expect(next.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(next[0]).toMatchObject({ unreadCount: 1, lastMessage: { id: "m1" } });
  });

  it("mensagem minha ou da conversa aberta não conta como não lida", () => {
    const list = [conv("c1")];
    expect(applyIncoming(list, { conversationId: "c1", message: msg("m1", "x", { mine: true }) }).list[0].unreadCount).toBe(0);
    expect(applyIncoming(list, { conversationId: "c1", message: msg("m1", "x") }, "c1").list[0].unreadCount).toBe(0);
  });

  it("a mesma mensagem duas vezes não soma duas vezes", () => {
    const once = applyIncoming([conv("c1")], { conversationId: "c1", message: msg("m1", "x") }).list;
    expect(applyIncoming(once, { conversationId: "c1", message: msg("m1", "x") }).list[0].unreadCount).toBe(1);
  });

  it("conversa desconhecida (nova): avisa para buscar a lista de novo", () => {
    expect(applyIncoming([conv("c1")], { conversationId: "c9", message: msg("m1", "x") }).known).toBe(false);
  });
});

describe("upsertConversation", () => {
  it("troca a conversa existente ou põe a nova no topo", () => {
    const list = [conv("c1"), conv("c2")];
    expect(upsertConversation(list, conv("c2", { blockedByMe: true }))[1].blockedByMe).toBe(true);
    expect(upsertConversation(list, conv("c3")).map((c) => c.id)).toEqual(["c3", "c1", "c2"]);
  });
});

describe("textos", () => {
  it("hora de hoje, 'Ontem' ou a data", () => {
    const now = new Date(2026, 10, 20, 18, 0);
    expect(formatMessageTime(new Date(2026, 10, 20, 14, 5).toISOString(), now)).toBe("14:05");
    expect(formatMessageTime(new Date(2026, 10, 19, 9, 0).toISOString(), now)).toBe("Ontem");
    expect(formatMessageTime(new Date(2026, 10, 2, 9, 0).toISOString(), now)).toBe("02/11");
  });

  it("prévia da última mensagem", () => {
    expect(lastMessagePreview(null)).toBe("Nenhuma mensagem ainda");
    expect(lastMessagePreview(msg("m", "x", { text: "Oi" }))).toBe("Oi");
    expect(lastMessagePreview(msg("m", "x", { text: "Oi", mine: true }))).toBe("Você: Oi");
    expect(lastMessagePreview(msg("m", "x", { kind: "photo", text: null }))).toBe("Foto");
    expect(lastMessagePreview(msg("m", "x", { kind: "location", text: null, mine: true }))).toBe("Você: Localização aproximada");
  });
});

describe("catchUpMessages (depois de reconectar)", () => {
  // 100 mensagens, da mais nova (m99) para a mais antiga (m0), em páginas de 30.
  const all = Array.from({ length: 100 }, (_, i) => msg(`m${i}`, `2026-11-20T10:${String(i).padStart(2, "0")}:00Z`)).reverse();
  const fetchPage = jest.fn(async (before?: string) => {
    const start = before ? all.findIndex((m) => m.id === before) + 1 : 0;
    const messages = all.slice(start, start + 30);
    return { messages, nextCursor: start + 30 < all.length ? messages[messages.length - 1].id : null };
  });
  beforeEach(() => fetchPage.mockClear());

  it("busca páginas para trás até encostar numa mensagem que já estava na tela", async () => {
    // Tinha até m40; chegaram m41..m99 (59 mensagens, mais de uma página).
    const result = await catchUpMessages(new Set(["m40", "m39"]), fetchPage);
    expect(result.reset).toBe(false);
    const ids = new Set(result.messages.map((m) => m.id));
    for (let i = 41; i < 100; i++) expect(ids.has(`m${i}`)).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("uma página basta quando chegou pouca coisa", async () => {
    const result = await catchUpMessages(new Set(["m95"]), fetchPage);
    expect(result.reset).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("sem encostar no que já tinha dentro do limite de páginas → recomeça a lista do zero, com o cursor da última", async () => {
    const result = await catchUpMessages(new Set(["nao-existe"]), fetchPage, 2);
    expect(result).toEqual({ messages: all.slice(0, 60), reset: true, nextCursor: "m40" });
  });
});
