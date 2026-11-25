import { CHAT_PAGE_SIZE, MASKED_EMAIL, MASKED_PHONE, distanceMeters, type ChatMessage } from "@miaucha/shared";
import { closeTestApp, expectNoPrivateData } from "./helpers";
import { chatUser, conversationPair, createChatTestApp, uniqueSpot, type ChatTestContext, type ChatUser } from "./chat-helpers";

let ctx: ChatTestContext;

beforeAll(async () => {
  ctx = await createChatTestApp();
});

afterAll(() => closeTestApp(ctx));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7, 6, 5]);

/** Nada que identifique o outro participante: e-mail, nome real, id interno (CH-02). */
function expectNothingAbout(body: unknown, ...people: ChatUser[]) {
  expectNoPrivateData(body);
  const json = JSON.stringify(body);
  for (const person of people) {
    expect(json.toLowerCase()).not.toContain(person.email.toLowerCase());
    expect(json).not.toContain(person.name);
    expect(json).not.toContain(person.user.id);
  }
  expect(json).not.toMatch(/"(email|phone|telefone|name|userId|senderId|authorId|requesterId)"/);
}

describe("iniciar conversa (CH-01)", () => {
  it("outra pessoa abre uma conversa a partir de uma ocorrência aberta; o autor vê pelo pseudônimo", async () => {
    const { author, other, occurrence, conversation } = await conversationPair(ctx);

    expect(conversation).toMatchObject({
      occurrence: { id: occurrence.id, type: "lost", species: "dog", petName: "Thor", status: "open" },
      otherPseudonym: author.user.pseudonym,
      iAmAuthor: false,
      lastMessage: null,
      unreadCount: 0,
      blockedByMe: false,
      canSend: true,
      contact: { mine: false, theirs: false, otherEmail: null },
    });

    const authorView = (await author.get(conversation.id).expect(200)).body;
    expect(authorView).toMatchObject({ id: conversation.id, otherPseudonym: other.user.pseudonym, iAmAuthor: true });
    expectNothingAbout(conversation, author, other);
    expectNothingAbout(authorView, author, other);
  });

  it("é idempotente: o mesmo par e a mesma ocorrência dão a mesma conversa", async () => {
    const { other, occurrence, conversation } = await conversationPair(ctx);
    const again = await other.startOk(occurrence.id);
    expect(again.id).toBe(conversation.id);
    const [a, b] = await Promise.all([other.startOk(occurrence.id), other.startOk(occurrence.id)]);
    expect(a.id).toBe(conversation.id);
    expect(b.id).toBe(conversation.id);
  });

  it("outra pessoa na mesma ocorrência abre outra conversa", async () => {
    const { occurrence, conversation } = await conversationPair(ctx);
    const third = await chatUser(ctx);
    expect((await third.startOk(occurrence.id)).id).not.toBe(conversation.id);
  });

  it("o autor não abre conversa consigo mesmo", async () => {
    const author = await chatUser(ctx);
    const occurrence = await author.createOccurrence();
    const res = await author.start(occurrence.id).expect(400);
    expect(res.body.message).toBe("Você não pode conversar com você mesmo");
  });

  it("ocorrência resolvida não aceita conversa nova, mas a que já existia continua", async () => {
    const { author, other, occurrence, conversation } = await conversationPair(ctx);
    await ctx.http.post(`/occurrences/${occurrence.id}/resolve`).set(author.auth).expect(200);

    const late = await chatUser(ctx);
    const res = await late.start(occurrence.id).expect(409);
    expect(res.body.message).toBe("Esta ocorrência não está mais aberta");

    expect((await other.startOk(occurrence.id)).id).toBe(conversation.id);
    await other.sendText(conversation.id, "Que bom que achou!");
  });

  it("ocorrência expirada (30 dias sem atualização) não aceita conversa nova", async () => {
    const author = await chatUser(ctx);
    const occurrence = await author.createOccurrence();
    await ctx.pool.query("update occurrences set updated_at = now() - interval '31 days' where id = $1", [occurrence.id]);
    await (await chatUser(ctx)).start(occurrence.id).expect(409);
  });

  it("ocorrência inexistente ou id inválido → 404", async () => {
    const user = await chatUser(ctx);
    await user.start("00000000-0000-4000-8000-000000000000").expect(404);
    await user.start("nao-e-uuid").expect(404);
    await user.start("").expect(404);
  });

  it("exige login", async () => {
    await ctx.http.post("/conversations").send({ occurrenceId: "x" }).expect(401);
    await ctx.http.get("/conversations").expect(401);
  });

  it("quem não participa recebe 404 em todas as rotas da conversa", async () => {
    const { conversation } = await conversationPair(ctx);
    const stranger = await chatUser(ctx);
    const id = conversation.id;
    await stranger.get(id).expect(404);
    await stranger.send(id, { text: "oi" }).expect(404);
    await ctx.http.get(`/conversations/${id}/messages`).set(stranger.auth).expect(404);
    await stranger.read(id).expect(404);
    await stranger.consent(id).expect(404);
    await stranger.block(id).expect(404);
    await stranger.report(id, { reason: "spam" }).expect(404);
    await stranger.requestUpload(id).expect(404);
  });
});

describe("mensagens de texto e lista de conversas", () => {
  it("as duas pessoas trocam mensagens; a lista mostra a última mensagem e as não lidas", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const sent = await other.sendText(conversation.id, "Oi! Vi um cão parecido com o Thor.");
    expect(sent).toMatchObject({ conversationId: conversation.id, mine: true, kind: "text", text: "Oi! Vi um cão parecido com o Thor.", readAt: null });
    await other.sendText(conversation.id, "Estava perto do metrô.");

    const [item] = (await author.list()).filter((c) => c.id === conversation.id);
    expect(item.lastMessage).toMatchObject({ text: "Estava perto do metrô.", mine: false });
    expect(item.unreadCount).toBe(2);
    expect(item.otherPseudonym).toBe(other.user.pseudonym);

    const [mine] = (await other.list()).filter((c) => c.id === conversation.id);
    expect(mine.unreadCount).toBe(0);
    expect(mine.lastMessage?.mine).toBe(true);

    const page = await author.messages(conversation.id);
    expect(page.messages.map((m) => m.text)).toEqual(["Estava perto do metrô.", "Oi! Vi um cão parecido com o Thor."]);
    expect(page.messages.every((m) => !m.mine)).toBe(true);
    expectNothingAbout(page, author, other);
    expectNothingAbout(await author.list(), author, other);
  });

  it("a lista vem da conversa mais recente para a mais antiga", async () => {
    const user = await chatUser(ctx);
    const a = await chatUser(ctx);
    const b = await chatUser(ctx);
    const first = await user.startOk((await a.createOccurrence()).id);
    const second = await user.startOk((await b.createOccurrence()).id);
    await user.sendText(first.id, "mensagem nova na primeira");
    expect((await user.list()).map((c) => c.id)).toEqual([first.id, second.id]);
  });

  it("CH-06: telefone, e-mail e link são mascarados antes de salvar", async () => {
    const { other, conversation } = await conversationPair(ctx);
    const sent = await other.sendText(conversation.id, "Me chama no (11) 98765-4321 ou bruno@gmail.com. Vi às 14:30.");
    expect(sent.text).toBe(`Me chama no ${MASKED_PHONE} ou ${MASKED_EMAIL}. Vi às 14:30.`);
    const { rows } = await ctx.pool.query("select body from chat_messages where id = $1", [sent.id]);
    expect(rows[0].body).toBe(sent.text);
  });

  it("texto vazio ou longo demais → 400; corpo sem nada → 400", async () => {
    const { other, conversation } = await conversationPair(ctx);
    expect((await other.send(conversation.id, { text: "  " }).expect(400)).body.message).toBe("Escreva uma mensagem");
    await other.send(conversation.id, { text: "a".repeat(2001) }).expect(400);
    await other.send(conversation.id, {}).expect(400);
  });
});

describe("histórico paginado (CH-09)", () => {
  it("mais novas primeiro, por cursor, sem repetir nem pular", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const total = CHAT_PAGE_SIZE + 12;
    for (let i = 1; i <= total; i++) await (i % 2 ? other : author).sendText(conversation.id, `msg ${i}`);

    const first = await author.messages(conversation.id);
    expect(first.messages).toHaveLength(CHAT_PAGE_SIZE);
    expect(first.messages[0].text).toBe(`msg ${total}`);
    expect(first.nextCursor).toBe(first.messages[CHAT_PAGE_SIZE - 1].id);

    const second = await author.messages(conversation.id, { before: first.nextCursor! });
    expect(second.messages).toHaveLength(12);
    expect(second.nextCursor).toBeNull();
    const all = [...first.messages, ...second.messages].map((m) => m.text);
    expect(all).toEqual(Array.from({ length: total }, (_, i) => `msg ${total - i}`));
  });

  it("limit menor que a página; cursor inválido ou de outra conversa → 400", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    for (let i = 1; i <= 5; i++) await other.sendText(conversation.id, `m${i}`);
    const page = await author.messages(conversation.id, { limit: 2 });
    expect(page.messages.map((m) => m.text)).toEqual(["m5", "m4"]);
    expect(page.nextCursor).toBe(page.messages[1].id);

    await ctx.http.get(`/conversations/${conversation.id}/messages`).query({ before: "nao-e-uuid" }).set(author.auth).expect(400);
    const elsewhere = await conversationPair(ctx);
    const foreign = await elsewhere.other.sendText(elsewhere.conversation.id, "outra conversa");
    await ctx.http.get(`/conversations/${conversation.id}/messages`).query({ before: foreign.id }).set(author.auth).expect(400);
  });
});

describe("confirmação de leitura (CH-09)", () => {
  it("marcar como lida zera as não lidas e quem enviou vê a hora da leitura", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.sendText(conversation.id, "um");
    await other.sendText(conversation.id, "dois");
    await author.sendText(conversation.id, "resposta do autor");

    await author.read(conversation.id).expect(204);
    expect((await author.get(conversation.id).expect(200)).body.unreadCount).toBe(0);

    const seenByOther = await other.messages(conversation.id);
    const mine = seenByOther.messages.filter((m) => m.mine);
    expect(mine).toHaveLength(2);
    for (const m of mine) expect(m.readAt).not.toBeNull();
    // A mensagem do autor ainda não foi lida pelo outro.
    expect(seenByOther.messages.find((m) => !m.mine)?.readAt).toBeNull();
    expect((await other.get(conversation.id).expect(200)).body.unreadCount).toBe(1);
  });
});

describe("foto e localização (CH-05)", () => {
  async function upload(user: ChatUser, conversationId: string, body = jpeg) {
    const req = await user.requestUpload(conversationId).expect(201);
    const put = await fetch(req.body.uploadUrl, { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": "image/jpeg" } });
    expect(put.status).toBe(200);
    return req.body.photoId as string;
  }

  it("envia foto pelo fluxo de URL assinada; a outra pessoa recebe URL assinada", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const photoId = await upload(other, conversation.id);
    await other.confirm(conversation.id, photoId).expect(200);

    const res = await other.send(conversation.id, { photoId }).expect(201);
    expect(res.body).toMatchObject({ kind: "photo", text: null, location: null });
    const [received] = (await author.messages(conversation.id)).messages;
    expect(received.kind).toBe("photo");
    expect(received.photoUrl).toMatch(/X-Amz-Signature=/);
    const image = await fetch(received.photoUrl!);
    expect(Buffer.from(await image.arrayBuffer())).toEqual(jpeg);

    // A mesma foto não vira duas mensagens.
    await other.send(conversation.id, { photoId }).expect(400);
  });

  it("mesmas validações das fotos: arquivo que não é imagem é recusado; foto não confirmada não pode ser enviada", async () => {
    const { other, conversation } = await conversationPair(ctx);
    await other.requestUpload(conversation.id, "application/pdf").expect(400);

    const fake = await upload(other, conversation.id, Buffer.from("File not found"));
    expect((await other.confirm(conversation.id, fake).expect(400)).body.message).toBe("O arquivo enviado não é uma imagem válida");

    const pending = await upload(other, conversation.id);
    await other.send(conversation.id, { photoId: pending }).expect(400);
  });

  it("foto de outra conversa não pode ser enviada aqui", async () => {
    const a = await conversationPair(ctx);
    const photoId = await upload(a.other, a.conversation.id);
    await a.other.confirm(a.conversation.id, photoId).expect(200);
    const otherConversation = await a.other.startOk((await (await chatUser(ctx)).createOccurrence()).id);
    await a.other.send(otherConversation.id, { photoId }).expect(400);
  });

  it("localização: guarda e devolve só um ponto aproximado (50 a 200 m do real), nunca o exato", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const real = uniqueSpot();
    const res = await other.send(conversation.id, { location: real }).expect(201);
    const sent = res.body as ChatMessage;
    expect(sent.kind).toBe("location");

    const [received] = (await author.messages(conversation.id)).messages;
    for (const message of [sent, received]) {
      const d = distanceMeters(real, message.location!);
      expect(d).toBeGreaterThan(50);
      expect(d).toBeLessThan(200);
      expect(JSON.stringify(message)).not.toContain(String(real.lat));
      expect(JSON.stringify(message)).not.toContain(String(real.lng));
    }
    const { rows } = await ctx.pool.query<{ lat: number; lng: number }>(
      "select st_y(location::geometry) as lat, st_x(location::geometry) as lng from chat_messages where id = $1",
      [sent.id],
    );
    expect(distanceMeters(real, rows[0])).toBeGreaterThan(50);
  });

  it("localização inválida → 400", async () => {
    const { other, conversation } = await conversationPair(ctx);
    await other.send(conversation.id, { location: { lat: 200, lng: 0 } }).expect(400);
    await other.send(conversation.id, { location: { lat: "-23.5", lng: "-46.6" } }).expect(400);
  });
});

describe("compartilhar contato com opt-in duplo (CH-07)", () => {
  it("só depois que os dois aceitam cada um vê o e-mail do outro", async () => {
    const { author, other, conversation } = await conversationPair(ctx);

    const afterOther = (await other.consent(conversation.id).expect(200)).body;
    expect(afterOther.contact).toEqual({ mine: true, theirs: false, otherEmail: null });
    expectNothingAbout(afterOther, author, other);

    const authorBefore = (await author.get(conversation.id).expect(200)).body;
    expect(authorBefore.contact).toEqual({ mine: false, theirs: true, otherEmail: null });
    expectNothingAbout(authorBefore, author, other);
    expectNothingAbout(await author.list(), author, other);

    const authorAfter = (await author.consent(conversation.id).expect(200)).body;
    expect(authorAfter.contact).toEqual({ mine: true, theirs: true, otherEmail: other.email });
    const otherAfter = (await other.get(conversation.id).expect(200)).body;
    expect(otherAfter.contact).toEqual({ mine: true, theirs: true, otherEmail: author.email });
    // Nem com o contato liberado aparece o nome real ou o id.
    expect(JSON.stringify(otherAfter)).not.toContain(author.name);
    expect(JSON.stringify(otherAfter)).not.toContain(author.user.id);
  });

  it("quem desiste esconde o contato de novo", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.consent(conversation.id).expect(200);
    await author.consent(conversation.id).expect(200);
    const res = (await author.revokeConsent(conversation.id).expect(200)).body;
    expect(res.contact).toEqual({ mine: false, theirs: true, otherEmail: null });
    expect((await other.get(conversation.id).expect(200)).body.contact.otherEmail).toBeNull();
  });
});

describe("bloquear e denunciar (CH-08)", () => {
  it("o bloqueado não envia mais nessa conversa; quem bloqueou também não, até desbloquear", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const blocked = (await author.block(conversation.id).expect(200)).body;
    expect(blocked).toMatchObject({ blockedByMe: true, canSend: false });

    const res = await other.send(conversation.id, { text: "oi?" }).expect(403);
    expect(res.body.message).toBe("Não é possível enviar mensagens nesta conversa");
    expect((await other.get(conversation.id).expect(200)).body).toMatchObject({ blockedByMe: false, canSend: false });
    await author.send(conversation.id, { text: "oi" }).expect(403);

    const unblocked = (await author.unblock(conversation.id).expect(200)).body;
    expect(unblocked).toMatchObject({ blockedByMe: false, canSend: true });
    await other.sendText(conversation.id, "voltou");
  });

  it("o bloqueado não abre conversa nova com quem bloqueou, nem em outra ocorrência", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await author.block(conversation.id).expect(200);
    const another = await author.createOccurrence();
    const res = await other.start(another.id).expect(403);
    expect(res.body.message).toBe("Não é possível conversar com esta pessoa");
  });

  it("com o bloqueio o contato compartilhado some", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.consent(conversation.id).expect(200);
    await author.consent(conversation.id).expect(200);
    await other.block(conversation.id).expect(200);
    expect((await author.get(conversation.id).expect(200)).body.contact.otherEmail).toBeNull();
  });

  it("denúncia vai para a fila de moderação com o motivo", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.sendText(conversation.id, "Me manda R$ 200 que eu devolvo o cachorro");
    await author.report(conversation.id, { reason: "scam", details: "Pediu dinheiro" }).expect(204);

    const { rows } = await ctx.pool.query(
      "select reporter_id, reported_id, reason, details, status from chat_reports where conversation_id = $1",
      [conversation.id],
    );
    expect(rows).toEqual([{ reporter_id: author.user.id, reported_id: other.user.id, reason: "scam", details: "Pediu dinheiro", status: "pending" }]);
  });

  it("motivo inválido → 400", async () => {
    const { author, conversation } = await conversationPair(ctx);
    await author.report(conversation.id, { reason: "nao-gostei" }).expect(400);
    await author.report(conversation.id, { reason: "other", details: "a".repeat(1001) }).expect(400);
  });
});
