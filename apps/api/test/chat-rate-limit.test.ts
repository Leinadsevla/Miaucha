import { closeTestApp } from "./helpers";
import { chatUser, conversationPair, createChatTestApp, type ChatTestContext } from "./chat-helpers";

/** NF-04 no chat: o limite de mensagens é por usuário (não por IP) e separado do limite geral. */
describe("rate limit no chat (NF-04)", () => {
  let ctx: ChatTestContext;

  beforeAll(async () => {
    ctx = await createChatTestApp({ chatThrottle: { ttlMs: 60_000, limit: 3 } });
  });

  afterAll(() => closeTestApp(ctx));

  it("POST /conversations/:id/messages: passou do limite → 429, só para quem passou", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    for (let i = 0; i < 3; i++) await other.sendText(conversation.id, `msg ${i}`);
    const res = await other.send(conversation.id, { text: "mais uma" }).expect(429);
    expect(res.body.message).toBe("Muitas tentativas. Espere um pouco e tente de novo.");

    // Mesmo IP, outro usuário: ainda pode enviar.
    await author.sendText(conversation.id, "resposta");
  });

  it("abrir conversa e denunciar usam o limite geral", async () => {
    const limited = await createChatTestApp({ throttle: { ttlMs: 60_000, limit: 2 } });
    try {
      const author = await chatUser(limited);
      const occurrences = [await author.createOccurrence(), await author.createOccurrence()];
      const visitor = await chatUser(limited);
      await visitor.start(occurrences[0].id).expect(200);
      await visitor.start(occurrences[1].id).expect(200);
      await visitor.start(occurrences[1].id).expect(429);
    } finally {
      await closeTestApp(limited);
    }
  });
});
