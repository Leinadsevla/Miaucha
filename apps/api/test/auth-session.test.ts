import { closeTestApp, createTestApp, expectNoPrivateData, PASSWORD, signUpVerified, uniqueEmail, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

describe("POST /auth/login", () => {
  it("senha certa → tokens", async () => {
    const { email, body: verified } = await signUpVerified(ctx);
    const res = await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { id: verified.user.id, name: "Ana Souza", pseudonym: verified.user.pseudonym, hasConsent: false },
    });
    expectNoPrivateData(res.body, email);
  });

  it("aceita o e-mail com maiúsculas e espaços", async () => {
    const { email } = await signUpVerified(ctx);
    await ctx.http.post("/auth/login").send({ email: ` ${email.toUpperCase()} `, password: PASSWORD }).expect(200);
  });

  it("senha errada → 401 com mensagem genérica", async () => {
    const { email } = await signUpVerified(ctx);
    const res = await ctx.http.post("/auth/login").send({ email, password: "outra1234" }).expect(401);
    expect(res.body.message).toBe("E-mail ou senha incorretos");
  });

  it("e-mail sem conta → mesma resposta da senha errada", async () => {
    const res = await ctx.http.post("/auth/login").send({ email: uniqueEmail(), password: PASSWORD }).expect(401);
    expect(res.body.message).toBe("E-mail ou senha incorretos");
  });

  it("conta só do Google (sem senha) → 401", async () => {
    const email = uniqueEmail();
    ctx.google.tokens.set("google-sem-senha", { sub: `sub-${email}`, email, emailVerified: true, name: "Bia" });
    await ctx.http.post("/auth/google").send({ idToken: "google-sem-senha" }).expect(200);
    await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(401);
  });

  it("e-mail não verificado → 403, mas só com a senha certa", async () => {
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Ana", email, password: PASSWORD }).expect(201);
    const res = await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(403);
    expect(res.body.message).toBe("Confirme seu e-mail para entrar");
    await ctx.http.post("/auth/login").send({ email, password: "outra1234" }).expect(401);
  });

  it("dados inválidos → 400 com as mensagens de validateLogin", async () => {
    const res = await ctx.http.post("/auth/login").send({ email: "x", password: "" }).expect(400);
    expect(res.body.errors).toEqual({ email: "E-mail inválido", password: "Informe a senha" });
  });
});

describe("POST /auth/refresh", () => {
  it("troca o refresh token por um par novo; o antigo deixa de valer", async () => {
    const { body: session } = await signUpVerified(ctx);
    const res = await ctx.http.post("/auth/refresh").send({ refreshToken: session.refreshToken }).expect(200);

    expect(res.body.user).toEqual(session.user);
    expect(res.body.refreshToken).not.toBe(session.refreshToken);
    await ctx.http.post("/auth/refresh").send({ refreshToken: res.body.refreshToken }).expect(200);
  });

  it("reuso de um token já trocado → 401 e derruba todas as sessões do usuário", async () => {
    const { body: session } = await signUpVerified(ctx);
    const rotated = await ctx.http.post("/auth/refresh").send({ refreshToken: session.refreshToken }).expect(200);

    await ctx.http.post("/auth/refresh").send({ refreshToken: session.refreshToken }).expect(401);
    await ctx.http.post("/auth/refresh").send({ refreshToken: rotated.body.refreshToken }).expect(401);
  });

  it("token expirado → 401", async () => {
    const { body: session } = await signUpVerified(ctx);
    await ctx.pool.query("update refresh_tokens set expires_at = now() - interval '1 second' where user_id = $1", [
      session.user.id,
    ]);
    await ctx.http.post("/auth/refresh").send({ refreshToken: session.refreshToken }).expect(401);
  });

  it("token desconhecido ou ausente → 401", async () => {
    await ctx.http.post("/auth/refresh").send({ refreshToken: "inventado" }).expect(401);
    await ctx.http.post("/auth/refresh").send({}).expect(401);
  });

  it("o banco guarda só o hash do refresh token", async () => {
    const { body: session } = await signUpVerified(ctx);
    const { rows } = await ctx.pool.query("select token_hash from refresh_tokens where user_id = $1", [session.user.id]);
    expect(rows.map((r) => r.token_hash)).not.toContain(session.refreshToken);
  });
});

describe("POST /auth/logout", () => {
  it("revoga o refresh token", async () => {
    const { body: session } = await signUpVerified(ctx);
    await ctx.http.post("/auth/logout").send({ refreshToken: session.refreshToken }).expect(204);
    await ctx.http.post("/auth/refresh").send({ refreshToken: session.refreshToken }).expect(401);
  });

  it("token desconhecido → 204 (sair é sempre possível)", async () => {
    await ctx.http.post("/auth/logout").send({ refreshToken: "inventado" }).expect(204);
  });
});
