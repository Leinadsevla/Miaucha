import { closeTestApp, createTestApp, expectNoPrivateData, PASSWORD, signUpVerified, uniqueEmail, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

function googleToken(profile: { email: string; emailVerified?: boolean; name?: string; sub?: string }) {
  const idToken = `id-token-${Math.random().toString(36).slice(2)}`;
  ctx.google.tokens.set(idToken, {
    sub: profile.sub ?? `sub-${profile.email}`,
    email: profile.email,
    emailVerified: profile.emailVerified ?? true,
    name: profile.name ?? "Bia Lima",
  });
  return idToken;
}

describe("POST /auth/google", () => {
  it("primeiro acesso cria a conta já verificada, sem senha, e devolve tokens", async () => {
    const email = uniqueEmail("google");
    const res = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email }) }).expect(200);

    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: { id: expect.any(String), name: "Bia Lima", pseudonym: expect.any(String), hasConsent: false },
    });
    expectNoPrivateData(res.body, email);

    const { rows } = await ctx.pool.query("select password_hash, google_sub, email_verified_at from users where email = $1", [email]);
    expect(rows[0]).toEqual({ password_hash: null, google_sub: `sub-${email}`, email_verified_at: expect.any(Date) });
  });

  it("acessos seguintes entram na mesma conta", async () => {
    const email = uniqueEmail("google");
    const first = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email }) }).expect(200);
    const second = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email }) }).expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it("encontra a conta pelo `sub` mesmo se o e-mail do Google mudou", async () => {
    const email = uniqueEmail("google");
    const first = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email }) }).expect(200);
    const renamed = googleToken({ email: uniqueEmail("novo"), sub: `sub-${email}` });
    const second = await ctx.http.post("/auth/google").send({ idToken: renamed }).expect(200);
    expect(second.body.user.id).toBe(first.body.user.id);
  });

  it("e-mail já cadastrado com senha: liga o Google à mesma conta, e a senha continua valendo", async () => {
    const { email, body: existing } = await signUpVerified(ctx);
    const res = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email: email.toUpperCase() }) }).expect(200);
    expect(res.body.user.id).toBe(existing.user.id);
    await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(200);
  });

  it("cadastro não verificado: o Google assume a conta e descarta a senha nunca comprovada", async () => {
    // Evita o sequestro: alguém cadastra o e-mail da vítima com uma senha própria e espera ela entrar pelo Google.
    const email = uniqueEmail();
    await ctx.http.post("/auth/signup").send({ name: "Invasor", email, password: PASSWORD }).expect(201);
    const res = await ctx.http.post("/auth/google").send({ idToken: googleToken({ email }) }).expect(200);
    expect(res.body.user.name).toBe("Bia Lima");

    await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(401);
    const { rows } = await ctx.pool.query("select email_verified_at from users where email = $1", [email]);
    expect(rows[0].email_verified_at).not.toBeNull();
  });

  it("e-mail não verificado pelo Google → 401 (não dá para provar que é o dono)", async () => {
    const email = uniqueEmail("google");
    await ctx.http.post("/auth/google").send({ idToken: googleToken({ email, emailVerified: false }) }).expect(401);
  });

  it("token inválido ou ausente → 401", async () => {
    const res = await ctx.http.post("/auth/google").send({ idToken: "falso" }).expect(401);
    expect(res.body.message).toBe("Não foi possível entrar com o Google");
    await ctx.http.post("/auth/google").send({}).expect(401);
  });
});
