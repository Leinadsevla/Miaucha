import { closeTestApp, createTestApp, expectNoPrivateData, PASSWORD, uniqueEmail, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

const expireCode = (email: string) =>
  ctx.pool.query("update email_codes set expires_at = now() - interval '1 second' where email = $1", [email]);

const allowResend = (email: string) =>
  ctx.pool.query("update email_codes set sent_at = now() - interval '61 seconds' where email = $1", [email]);

describe("POST /auth/signup", () => {
  it("cria usuário não verificado, com senha em argon2, e envia um código de 6 dígitos", async () => {
    const email = uniqueEmail();
    const res = await ctx.http.post("/auth/signup").send({ name: "Ana Souza", email, password: PASSWORD }).expect(201);
    expectNoPrivateData(res.body, email);

    const { rows } = await ctx.pool.query("select * from users where email = $1", [email]);
    expect(rows).toHaveLength(1);
    expect(rows[0].email_verified_at).toBeNull();
    expect(rows[0].password_hash).toMatch(/^\$argon2id\$/);
    expect(rows[0].pseudonym).toMatch(/^\S+ \S+ \d{2}$/);

    const code = ctx.mailer.lastCodeFor(email);
    expect(code).toMatch(/^\d{6}$/);
    const stored = await ctx.pool.query("select code_hash from email_codes where email = $1", [email]);
    expect(stored.rows[0].code_hash).not.toContain(code);
  });

  it("normaliza o e-mail (espaços e maiúsculas)", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email: `  ${email.toUpperCase()} `, password: PASSWORD }).expect(201);
    const { rows } = await ctx.pool.query("select email from users where email = $1", [email]);
    expect(rows).toHaveLength(1);
  });

  it("e-mail repetido → 409, mesmo com maiúsculas", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const res = await ctx.http
      .post("/auth/signup")
      .send({ name: "Outra", email: email.toUpperCase(), password: PASSWORD })
      .expect(409);
    expect(res.body.message).toBe("Este e-mail já está cadastrado");
  });

  it("dados inválidos → 400 com as mesmas mensagens do app (validateSignUp)", async () => {
    const res = await ctx.http.post("/auth/signup").send({ name: "A", email: "nao-e-email", password: "curta" }).expect(400);
    expect(res.body.errors).toEqual({
      name: "Informe seu nome",
      email: "E-mail inválido",
      password: "A senha precisa de pelo menos 8 caracteres, com letras e números",
    });
  });

  it("corpo sem os campos → 400, não 500", async () => {
    await ctx.http.post("/auth/signup").send({}).expect(400);
  });
});

describe("POST /auth/verify-email", () => {
  async function signUp() {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana Souza", email, password: PASSWORD }).expect(201);
    return { email, code: ctx.mailer.lastCodeFor(email) };
  }

  it("código certo → tokens e usuário sem consentimento", async () => {
    const { email, code } = await signUp();
    const res = await ctx.http.post("/auth/verify-email").send({ email, code }).expect(200);

    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { id: expect.any(String), name: "Ana Souza", pseudonym: expect.any(String), hasConsent: false },
    });
    expectNoPrivateData(res.body, email);

    const { rows } = await ctx.pool.query("select email_verified_at from users where email = $1", [email]);
    expect(rows[0].email_verified_at).not.toBeNull();
  });

  it("o código só vale uma vez", async () => {
    const { email, code } = await signUp();
    await ctx.http.post("/auth/verify-email").send({ email, code }).expect(200);
    await ctx.http.post("/auth/verify-email").send({ email, code }).expect(410);
  });

  it("código errado → 400 e conta a tentativa", async () => {
    const { email, code } = await signUp();
    const wrong = code === "000000" ? "111111" : "000000";
    const res = await ctx.http.post("/auth/verify-email").send({ email, code: wrong }).expect(400);
    expect(res.body.message).toBe("Código incorreto");
    const { rows } = await ctx.pool.query("select attempts from email_codes where email = $1", [email]);
    expect(rows[0].attempts).toBe(1);
  });

  it("código fora do formato de 6 dígitos → 400", async () => {
    const { email } = await signUp();
    await ctx.http.post("/auth/verify-email").send({ email, code: "12ab" }).expect(400);
  });

  it("código expirado → 410", async () => {
    const { email, code } = await signUp();
    await expireCode(email);
    const res = await ctx.http.post("/auth/verify-email").send({ email, code }).expect(410);
    expect(res.body.message).toBe("Código expirado. Peça um novo.");
  });

  it("depois de 5 tentativas erradas → 410, mesmo com o código certo", async () => {
    const { email, code } = await signUp();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      await ctx.http.post("/auth/verify-email").send({ email, code: wrong }).expect(400);
    }
    await ctx.http.post("/auth/verify-email").send({ email, code }).expect(410);
  });

  it("e-mail sem código pendente → 410", async () => {
    await ctx.http.post("/auth/verify-email").send({ email: uniqueEmail(), code: "123456" }).expect(410);
  });
});

describe("POST /auth/resend-code", () => {
  it("envia um código novo e invalida o anterior", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const first = ctx.mailer.lastCodeFor(email);
    await allowResend(email);

    await ctx.http.post("/auth/resend-code").send({ email }).expect(204);
    const second = ctx.mailer.lastCodeFor(email);
    expect(ctx.mailer.sent.filter((m) => m.to === email)).toHaveLength(2);

    if (first !== second) await ctx.http.post("/auth/verify-email").send({ email, code: first }).expect(400);
    await ctx.http.post("/auth/verify-email").send({ email, code: second }).expect(200);
  });

  it("zera as tentativas", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    await ctx.pool.query("update email_codes set attempts = 5 where email = $1", [email]);
    await allowResend(email);
    await ctx.http.post("/auth/resend-code").send({ email }).expect(204);
    await ctx.http.post("/auth/verify-email").send({ email, code: ctx.mailer.lastCodeFor(email) }).expect(200);
  });

  it("limite de envios: só um código por minuto → 429", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const res = await ctx.http.post("/auth/resend-code").send({ email }).expect(429);
    expect(res.body.message).toBe("Aguarde um minuto para pedir outro código");
  });

  it("e-mail desconhecido ou já verificado → 204 sem enviar nada (não revela quem tem conta)", async () => {
    const unknown = uniqueEmail();
    await ctx.http.post("/auth/resend-code").send({ email: unknown }).expect(204);

    const verified = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email: verified, password: PASSWORD }).expect(201);
    await ctx.http.post("/auth/verify-email").send({ email: verified, code: ctx.mailer.lastCodeFor(verified) }).expect(200);
    const before = ctx.mailer.sent.length;
    await ctx.http.post("/auth/resend-code").send({ email: verified }).expect(204);

    expect(ctx.mailer.sent.length).toBe(before);
    expect(ctx.mailer.sent.some((m) => m.to === unknown)).toBe(false);
  });
});
