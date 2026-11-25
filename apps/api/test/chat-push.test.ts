import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { ExpoChatPushSender } from "../src/chat/expo-chat-push-sender";
import { CHAT_PUSH_SENDER } from "../src/chat/push-sender";
import { chatUser, createChatTestApp, type ChatTestContext } from "./chat-helpers";
import { FakePushSender, testConfig } from "./helpers";

let ctx: ChatTestContext;
let seq = 0;

beforeAll(async () => {
  ctx = await createChatTestApp();
});

afterAll(() => ctx.app.close().then(() => ctx.pool.end()));

const token = () => `ExponentPushToken[chat${Date.now()}x${seq++}]`;
const register = (auth: Record<string, string>, t: string) => ctx.http.post("/me/push-token").set(auth).send({ token: t }).expect(204);

describe("push de mensagem nova pelo Expo Push (CH-04)", () => {
  it("envia para todos os aparelhos do destinatário, com pseudônimo, trecho e o id da conversa", async () => {
    const ana = await chatUser(ctx);
    const [t1, t2] = [token(), token()];
    await register(ana.auth, t1);
    await register(ana.auth, t2);
    const expo = new FakePushSender();

    await new ExpoChatPushSender(ctx.pool, expo).send({
      userId: ana.user.id,
      title: "Tutor Azul 10",
      body: "Vi seu cachorro perto da praça",
      data: { conversationId: "c1" },
    });

    expect(expo.sent).toEqual(
      [t1, t2].map((to) => ({ to, title: "Tutor Azul 10", body: "Vi seu cachorro perto da praça", data: { conversationId: "c1" } })),
    );
  });

  it("sem aparelho registrado, não envia nada", async () => {
    const bia = await chatUser(ctx, "Bia");
    const expo = new FakePushSender();
    await new ExpoChatPushSender(ctx.pool, expo).send({ userId: bia.user.id, title: "x", body: "y", data: { conversationId: "c" } });
    expect(expo.sent).toEqual([]);
  });

  it("apaga os tokens que o Expo diz não existirem mais", async () => {
    const caio = await chatUser(ctx, "Caio");
    const [ok, dead] = [token(), token()];
    await register(caio.auth, ok);
    await register(caio.auth, dead);
    const expo = new FakePushSender();
    expo.invalidTokens.add(dead);

    await new ExpoChatPushSender(ctx.pool, expo).send({ userId: caio.user.id, title: "x", body: "y", data: { conversationId: "c" } });

    const { rows } = await ctx.pool.query("select token from push_tokens where user_id = $1", [caio.user.id]);
    expect(rows.map((r) => r.token)).toEqual([ok]);
  });

  it("o app usa o Expo Push de verdade para o chat (não mais só o log)", async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(testConfig())] }).compile();
    expect(moduleRef.get(CHAT_PUSH_SENDER)).toBeInstanceOf(ExpoChatPushSender);
    await moduleRef.close();
  });
});
