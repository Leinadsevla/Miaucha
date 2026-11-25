import { closeTestApp, createTestApp, expectNoPrivateData, PASSWORD, signUpVerified, uniqueEmail, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

const NEW_PASSWORD = "novaSenha99";

async function requestReset(email: string) {
  await ctx.http.post("/auth/forgot-password").send({ email }).expect(204);
  return ctx.mailer.lastCodeFor(email);
}

const allowResend = (email: string) =>
  ctx.pool.query("update password_reset_codes set sent_at = now() - interval '61 seconds' where email = $1", [email]);

describe("POST /auth/forgot-password", () => {
  it("conta existente recebe um código de 6 dígitos", async () => {
    const { email } = await signUpVerified(ctx);
    await ctx.http.post("/auth/forgot-password").send({ email: ` ${email.toUpperCase()} ` }).expect(204);
    expect(ctx.mailer.lastCodeFor(email)).toMatch(/^\d{6}$/);
  });

  it("e-mail sem conta → 204 sem enviar nada (não revela quem tem cadastro)", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/forgot-password").send({ email }).expect(204);
    expect(ctx.mailer.sent.some((m) => m.to === email)).toBe(false);
  });

  it("um pedido por minuto → 429", async () => {
    const { email } = await signUpVerified(ctx);
    await requestReset(email);
    const res = await ctx.http.post("/auth/forgot-password").send({ email }).expect(429);
    expect(res.body.message).toBe("Aguarde um minuto para pedir outro código");
  });
});

describe("POST /auth/reset-password", () => {
  it("código certo troca a senha, devolve sessão nova e derruba as sessões antigas", async () => {
    const { email, body: old } = await signUpVerified(ctx);
    const code = await requestReset(email);

    const res = await ctx.http.post("/auth/reset-password").send({ email, code, password: NEW_PASSWORD }).expect(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { id: old.user.id, name: "Ana Souza", pseudonym: old.user.pseudonym, hasConsent: false },
    });
    expectNoPrivateData(res.body, email);

    await ctx.http.post("/auth/refresh").send({ refreshToken: old.refreshToken }).expect(401);
    await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(401);
    await ctx.http.post("/auth/login").send({ email, password: NEW_PASSWORD }).expect(200);
  });

  it("o código só vale uma vez", async () => {
    const { email } = await signUpVerified(ctx);
    const code = await requestReset(email);
    await ctx.http.post("/auth/reset-password").send({ email, code, password: NEW_PASSWORD }).expect(200);
    await ctx.http.post("/auth/reset-password").send({ email, code, password: "outraSenha1" }).expect(410);
  });

  it("código errado → 400; 5 erros ou expirado → 410", async () => {
    const { email } = await signUpVerified(ctx);
    const code = await requestReset(email);
    const wrong = code === "000000" ? "111111" : "000000";
    const res = await ctx.http.post("/auth/reset-password").send({ email, code: wrong, password: NEW_PASSWORD }).expect(400);
    expect(res.body.message).toBe("Código incorreto");
    for (let i = 0; i < 4; i++) {
      await ctx.http.post("/auth/reset-password").send({ email, code: wrong, password: NEW_PASSWORD }).expect(400);
    }
    await ctx.http.post("/auth/reset-password").send({ email, code, password: NEW_PASSWORD }).expect(410);

    await allowResend(email);
    const fresh = await requestReset(email);
    await ctx.pool.query("update password_reset_codes set expires_at = now() - interval '1 second' where email = $1", [email]);
    await ctx.http.post("/auth/reset-password").send({ email, code: fresh, password: NEW_PASSWORD }).expect(410);
  });

  it("senha nova fraca → 400 com a mensagem do app", async () => {
    const { email } = await signUpVerified(ctx);
    const code = await requestReset(email);
    const res = await ctx.http.post("/auth/reset-password").send({ email, code, password: "curta" }).expect(400);
    expect(res.body.errors).toEqual({ password: "A senha precisa de pelo menos 8 caracteres, com letras e números" });
  });

  it("código de verificação de e-mail não serve para trocar a senha (e vice-versa)", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const verifyCode = ctx.mailer.lastCodeFor(email);
    await ctx.http.post("/auth/reset-password").send({ email, code: verifyCode, password: NEW_PASSWORD }).expect(410);
  });

  it("trocar a senha confirma o e-mail de um cadastro não verificado (o código chegou na caixa dele)", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const code = await requestReset(email);
    await ctx.http.post("/auth/reset-password").send({ email, code, password: NEW_PASSWORD }).expect(200);
    await ctx.http.post("/auth/login").send({ email, password: NEW_PASSWORD }).expect(200);
  });
});
