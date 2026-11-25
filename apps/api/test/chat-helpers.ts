import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { ChatConversation, ChatMessage, ChatMessagesPage, LatLng, PublicOccurrence } from "@miaucha/shared";
import { Pool } from "pg";
import { io, type Socket } from "socket.io-client";
import request from "supertest";
import { AppModule, configureApp } from "../src/app.module";
import { CHAT_PUSH_SENDER, type ChatPushNotification, type ChatPushSender } from "../src/chat/push-sender";
import type { AppConfig } from "../src/config";
import { runMigrations } from "../src/db/migrate";
import { GOOGLE_VERIFIER, MAILER, PUSH_SENDER } from "../src/tokens";
import { FakeGoogleVerifier, FakeMailer, FakePushSender, signUpVerified, testConfig, type TestContext } from "./helpers";

export class FakeChatPushSender implements ChatPushSender {
  sent: ChatPushNotification[] = [];

  async send(notification: ChatPushNotification) {
    this.sent.push(notification);
  }
}

export type ChatTestContext = TestContext & { chatPush: FakeChatPushSender; url: string };

/**
 * Igual ao `createTestApp`, mas escuta numa porta de verdade (o socket.io-client precisa) e troca o
 * envio de push por um falso.
 */
export async function createChatTestApp(
  overrides: Partial<AppConfig> = {},
  prepare?: (app: INestApplication) => Promise<void>,
): Promise<ChatTestContext> {
  const config = testConfig({ chatThrottle: { ttlMs: 60_000, limit: 1000 }, ...overrides });
  const pool = new Pool({ connectionString: config.databaseUrl });
  await runMigrations(pool);

  const mailer = new FakeMailer();
  const google = new FakeGoogleVerifier();
  const chatPush = new FakeChatPushSender();
  // Push dos alertas também falso: criar ocorrência num teste não pode chamar o Expo Push de verdade.
  const push = new FakePushSender();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
    .overrideProvider(MAILER)
    .useValue(mailer)
    .overrideProvider(GOOGLE_VERIFIER)
    .useValue(google)
    .overrideProvider(CHAT_PUSH_SENDER)
    .useValue(chatPush)
    .overrideProvider(PUSH_SENDER)
    .useValue(push)
    .compile();

  const app = configureApp(moduleRef.createNestApplication(), config);
  await prepare?.(app);
  await app.listen(0, "127.0.0.1");
  const url = await app.getUrl();
  return { app, http: request(app.getHttpServer()), mailer, google, pool, push, chatPush, url };
}

/** Ponto sorteado longe dos outros testes (todos usam o mesmo banco). */
export function uniqueSpot(): LatLng {
  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round6(-50 + Math.random() * 100), lng: round6(-170 + Math.random() * 340) };
}

export type ChatUser = Awaited<ReturnType<typeof chatUser>>;

/** Usuário logado com atalhos para as rotas do chat. */
export async function chatUser(ctx: ChatTestContext, name = "Ana Souza") {
  const { body, email } = await signUpVerified(ctx, undefined, name);
  const auth = { Authorization: `Bearer ${body.accessToken}` };
  const base = (id: string) => `/conversations/${id}`;
  return {
    auth,
    email,
    name,
    token: body.accessToken,
    user: body.user,
    createOccurrence: async (data: object = {}) =>
      (await ctx.http.post("/occurrences").set(auth).send({ type: "lost", species: "dog", petName: "Thor", ...uniqueSpot(), ...data }).expect(201))
        .body as PublicOccurrence,
    start: (occurrenceId: string) => ctx.http.post("/conversations").set(auth).send({ occurrenceId }),
    startOk: async (occurrenceId: string) =>
      (await ctx.http.post("/conversations").set(auth).send({ occurrenceId }).expect(200)).body as ChatConversation,
    list: async () => (await ctx.http.get("/conversations").set(auth).expect(200)).body as ChatConversation[],
    get: (id: string) => ctx.http.get(base(id)).set(auth),
    send: (id: string, body: object) => ctx.http.post(`${base(id)}/messages`).set(auth).send(body),
    sendText: async (id: string, text: string) =>
      (await ctx.http.post(`${base(id)}/messages`).set(auth).send({ text }).expect(201)).body as ChatMessage,
    messages: async (id: string, query: Record<string, string | number> = {}) =>
      (await ctx.http.get(`${base(id)}/messages`).query(query).set(auth).expect(200)).body as ChatMessagesPage,
    read: (id: string) => ctx.http.post(`${base(id)}/read`).set(auth).send(),
    consent: (id: string) => ctx.http.post(`${base(id)}/contact-consent`).set(auth).send(),
    revokeConsent: (id: string) => ctx.http.delete(`${base(id)}/contact-consent`).set(auth).send(),
    block: (id: string) => ctx.http.post(`${base(id)}/block`).set(auth).send(),
    unblock: (id: string) => ctx.http.delete(`${base(id)}/block`).set(auth).send(),
    report: (id: string, body: object) => ctx.http.post(`${base(id)}/report`).set(auth).send(body),
    requestUpload: (id: string, contentType = "image/jpeg") => ctx.http.post(`${base(id)}/photos`).set(auth).send({ contentType }),
    confirm: (id: string, photoId: string) => ctx.http.post(`${base(id)}/photos/${photoId}/confirm`).set(auth).send(),
  };
}

/** Autor com uma ocorrência aberta e outra pessoa já conversando com ele. */
export async function conversationPair(ctx: ChatTestContext) {
  const author = await chatUser(ctx, "Ana Autora");
  const other = await chatUser(ctx, "Bruno Visitante");
  const occurrence = await author.createOccurrence();
  const conversation = await other.startOk(occurrence.id);
  return { author, other, occurrence, conversation };
}

/** Socket do chat autenticado; resolve quando conecta. */
export function connectSocket(ctx: ChatTestContext, token: string | undefined): Promise<Socket> {
  const socket = io(`${ctx.url}/chat`, { auth: token ? { token } : {}, transports: ["websocket"], reconnection: false, forceNew: true });
  return new Promise((resolve, reject) => {
    socket.once("connect", () => resolve(socket));
    socket.once("connect_error", (error) => {
      socket.close();
      reject(error);
    });
  });
}

/** Próximo evento `event` no socket (ou erro depois de `ms`). */
export function nextEvent<T = unknown>(socket: Socket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`evento ${event} não chegou em ${ms} ms`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Junta tudo o que chega em `event` (para conferir que algo NÃO chegou). */
export function collect<T = unknown>(socket: Socket, event: string): T[] {
  const received: T[] = [];
  socket.on(event, (payload: T) => received.push(payload));
  return received;
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
