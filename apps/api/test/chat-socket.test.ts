import type { ChatConversation, ChatMessage } from "@miaucha/shared";
import type { Socket } from "socket.io-client";
import { closeTestApp } from "./helpers";
import {
  chatUser,
  collect,
  connectSocket,
  conversationPair,
  createChatTestApp,
  nextEvent,
  wait,
  type ChatTestContext,
  type ChatUser,
} from "./chat-helpers";

let ctx: ChatTestContext;
const sockets: Socket[] = [];

beforeAll(async () => {
  ctx = await createChatTestApp();
});

afterEach(() => {
  for (const s of sockets.splice(0)) s.close();
});

afterAll(() => closeTestApp(ctx));

async function connect(user: ChatUser) {
  const socket = await connectSocket(ctx, user.token);
  sockets.push(socket);
  return socket;
}

type NewMessageEvent = { conversationId: string; message: ChatMessage };

function expectNothingAbout(payload: unknown, ...people: ChatUser[]) {
  const json = JSON.stringify(payload);
  for (const person of people) {
    expect(json.toLowerCase()).not.toContain(person.email.toLowerCase());
    expect(json).not.toContain(person.name);
    expect(json).not.toContain(person.user.id);
  }
  expect(json).not.toMatch(/"(email|phone|name|userId|senderId)"/);
}

describe("autenticação do socket", () => {
  it("sem token ou com token inválido a conexão é recusada", async () => {
    await expect(connectSocket(ctx, undefined)).rejects.toThrow("unauthorized");
    await expect(connectSocket(ctx, "token-falso")).rejects.toThrow("unauthorized");
  });

  it("com o access token conecta", async () => {
    const socket = await connect(await chatUser(ctx));
    expect(socket.connected).toBe(true);
  });
});

describe("tempo real (CH-03)", () => {
  it("mensagem enviada chega ao outro participante em menos de 2 s, sem dados pessoais", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const authorSocket = await connect(author);
    const otherSocket = await connect(other);

    const toAuthor = nextEvent<NewMessageEvent>(authorSocket, "message:new");
    const toSender = nextEvent<NewMessageEvent>(otherSocket, "message:new");
    const startedAt = Date.now();
    const sent = await other.sendText(conversation.id, "Oi! Vi o Thor agora.");

    const received = await toAuthor;
    expect(Date.now() - startedAt).toBeLessThan(2000);
    expect(received).toEqual({ conversationId: conversation.id, message: { ...sent, mine: false } });
    // Outros aparelhos de quem enviou também recebem, como "mine".
    expect((await toSender).message).toEqual(sent);
    expectNothingAbout(received, author, other);
  });

  it("terceiros não recebem nada", async () => {
    const { other, conversation } = await conversationPair(ctx);
    const strangerSocket = await connect(await chatUser(ctx));
    const leaked = collect(strangerSocket, "message:new");
    await other.sendText(conversation.id, "só para o autor");
    await wait(300);
    expect(leaked).toEqual([]);
  });

  it("leitura avisa quem enviou (message:read)", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.sendText(conversation.id, "lê aí");
    const otherSocket = await connect(other);
    const read = nextEvent<{ conversationId: string; readAt: string }>(otherSocket, "message:read");
    await author.read(conversation.id).expect(204);
    const event = await read;
    expect(event.conversationId).toBe(conversation.id);
    expect(Number.isNaN(Date.parse(event.readAt))).toBe(false);
    expectNothingAbout(event, author, other);
  });

  it("aceitar compartilhar contato avisa o outro (conversation:updated, com a visão dele)", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.consent(conversation.id).expect(200);
    const authorSocket = await connect(author);
    const otherSocket = await connect(other);
    const toOther = nextEvent<{ conversation: ChatConversation }>(otherSocket, "conversation:updated");
    const toAuthor = nextEvent<{ conversation: ChatConversation }>(authorSocket, "conversation:updated");
    await author.consent(conversation.id).expect(200);
    expect((await toOther).conversation.contact).toEqual({ mine: true, theirs: true, otherEmail: author.email });
    expect((await toAuthor).conversation.contact).toEqual({ mine: true, theirs: true, otherEmail: other.email });
  });
});

describe("push para quem está offline (CH-04)", () => {
  it("destinatário sem socket conectado recebe push com o pseudônimo e um trecho", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await other.sendText(conversation.id, "Oi! Me chama no 11 98765-4321");
    const push = ctx.push.sent.filter((p) => p.data.conversationId === conversation.id);
    expect(push).toEqual([
      {
        userId: author.user.id,
        title: other.user.pseudonym,
        body: "Oi! Me chama no [telefone oculto]",
        data: { conversationId: conversation.id },
      },
    ]);
    expect(JSON.stringify(push)).not.toContain(other.email);
    expect(JSON.stringify(push)).not.toContain(other.name);
  });

  it("destinatário conectado não recebe push", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    await connect(author);
    await other.sendText(conversation.id, "online");
    expect(ctx.push.sent.filter((p) => p.data.conversationId === conversation.id)).toEqual([]);
  });

  it("depois que desconecta volta a receber push", async () => {
    const { author, other, conversation } = await conversationPair(ctx);
    const socket = await connect(author);
    socket.close();
    await wait(200);
    await other.sendText(conversation.id, "voltei");
    expect(ctx.push.sent.filter((p) => p.data.conversationId === conversation.id)).toHaveLength(1);
  });
});
