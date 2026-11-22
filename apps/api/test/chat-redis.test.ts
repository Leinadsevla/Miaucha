import type { ChatMessage } from "@miaucha/shared";
import { GenericContainer, Wait, type StartedTestContainer } from "testcontainers";
import { useRedisAdapter } from "../src/chat/redis-io-adapter";
import { closeTestApp } from "./helpers";
import { connectSocket, conversationPair, createChatTestApp, nextEvent, type ChatTestContext } from "./chat-helpers";

/**
 * Duas instâncias da API com o adapter do Redis (CH-03 com escala horizontal): a mensagem enviada por HTTP
 * numa instância chega ao socket conectado na outra, e a primeira sabe que o destinatário está online.
 */
describe("Socket.IO com Redis entre duas instâncias", () => {
  let redis: StartedTestContainer;
  let a: ChatTestContext;
  let b: ChatTestContext;

  beforeAll(async () => {
    redis = await new GenericContainer("redis:7-alpine").withExposedPorts(6379).withWaitStrategy(Wait.forListeningPorts()).start();
    const url = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;
    const prepare = (app: Parameters<typeof useRedisAdapter>[0]) => useRedisAdapter(app, url);
    a = await createChatTestApp({}, prepare);
    b = await createChatTestApp({}, prepare);
  }, 120_000);

  afterAll(async () => {
    await closeTestApp(a);
    await closeTestApp(b);
    await redis.stop();
  });

  it("mensagem enviada na instância A chega ao socket da instância B, sem push", async () => {
    const { author, other, conversation } = await conversationPair(a);
    const socket = await connectSocket(b, author.token);
    try {
      const received = nextEvent<{ message: ChatMessage }>(socket, "message:new");
      const sent = await other.sendText(conversation.id, "olá de outra instância");
      expect((await received).message).toEqual({ ...sent, mine: false });
      expect(a.chatPush.sent.filter((p) => p.data.conversationId === conversation.id)).toEqual([]);
    } finally {
      socket.close();
    }
  });
});
