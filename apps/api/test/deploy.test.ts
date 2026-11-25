import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { ConsoleMailer } from "../src/mail/mailer";
import { GmailApiMailer } from "../src/mail/gmail-mailer";
import { ResendMailer } from "../src/mail/resend-mailer";
import { MAILER } from "../src/tokens";
import { PASSWORD, closeTestApp, createTestApp, testConfig, uniqueEmail, type TestContext } from "./helpers";

describe("GET /health (verificação do Render)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => closeTestApp(ctx));

  it("responde 200 sem login quando o banco está acessível", async () => {
    const res = await ctx.http.get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok", mail: "log" });
  });

  it("diz qual provedor de e-mail está ativo (sem expor nenhum valor)", async () => {
    const gmail = { clientId: "c", clientSecret: "segredo", refreshToken: "r", sender: "p@gmail.com" };
    const withGmail = await createTestApp({ gmail });
    try {
      const res = await withGmail.http.get("/health").expect(200);
      expect(res.body).toEqual({ status: "ok", mail: "gmail" });
      expect(JSON.stringify(res.body)).not.toContain("segredo");
    } finally {
      await closeTestApp(withGmail);
    }
  });
});

describe("trust proxy (rate limit atrás do proxy do Render)", () => {
  const login = (ctx: TestContext, ip: string) =>
    ctx.http.post("/auth/login").set("X-Forwarded-For", ip).send({ email: "x@exemplo.com", password: "senha1234" });

  it("com TRUST_PROXY=1, cada cliente (IP do X-Forwarded-For) tem o seu limite", async () => {
    const ctx = await createTestApp({ throttle: { ttlMs: 60_000, limit: 1 }, trustProxy: 1 });
    try {
      expect((await login(ctx, "203.0.113.1")).status).not.toBe(429);
      expect((await login(ctx, "203.0.113.2")).status).not.toBe(429);
      expect((await login(ctx, "203.0.113.1")).status).toBe(429);
    } finally {
      await closeTestApp(ctx);
    }
  });

  it("sem TRUST_PROXY, o X-Forwarded-For é ignorado (ninguém burla o limite inventando o cabeçalho)", async () => {
    const ctx = await createTestApp({ throttle: { ttlMs: 60_000, limit: 1 } });
    try {
      expect((await login(ctx, "203.0.113.1")).status).not.toBe(429);
      expect((await login(ctx, "203.0.113.2")).status).toBe(429);
    } finally {
      await closeTestApp(ctx);
    }
  });
});

describe("e-mail: Resend quando configurado", () => {
  it("com RESEND_API_KEY usa o Resend; sem ela, o log de desenvolvimento", async () => {
    const withResend = await Test.createTestingModule({
      imports: [AppModule.forRoot(testConfig({ resend: { apiKey: "re_x", from: "Miaucha <onboarding@resend.dev>" } }))],
    }).compile();
    expect(withResend.get(MAILER)).toBeInstanceOf(ResendMailer);
    await withResend.close();

    const without = await Test.createTestingModule({ imports: [AppModule.forRoot(testConfig())] }).compile();
    expect(without.get(MAILER)).toBeInstanceOf(ConsoleMailer);
    await without.close();
  });
});

describe("e-mail: Gmail quando configurado", () => {
  it("com as variáveis do Gmail usa a API do Gmail, mesmo se o Resend também estiver configurado", async () => {
    const gmail = { clientId: "c", clientSecret: "s", refreshToken: "r", sender: "projeto.miaucha@gmail.com" };
    const ref = await Test.createTestingModule({
      imports: [AppModule.forRoot(testConfig({ gmail, resend: { apiKey: "re_x", from: "f" } }))],
    }).compile();
    expect(ref.get(MAILER)).toBeInstanceOf(GmailApiMailer);
    await ref.close();
  });
});

describe("cadastro quando o e-mail não sai", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => closeTestApp(ctx));

  it("responde 503 e desfaz o cadastro, para a pessoa poder tentar de novo", async () => {
    const email = uniqueEmail();
    ctx.mailer.failNext = true;
    const res = await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(503);
    expect(res.body.message).toBe("Não foi possível enviar o e-mail com o código. Tente de novo em instantes.");
    const { rows } = await ctx.pool.query("select 1 from users where email = $1", [email]);
    expect(rows).toHaveLength(0);

    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
  });
});
