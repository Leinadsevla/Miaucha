import { JwtService } from "@nestjs/jwt";
import { closeTestApp, createTestApp, PASSWORD, signUpVerified, testConfig, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

const fullConsent = { privacyPolicy: true, approximateLocation: true };

describe("POST /me/consent", () => {
  it("grava consent_at; o próximo login já vem com hasConsent", async () => {
    const { email, body: session } = await signUpVerified(ctx);
    await ctx.http.post("/me/consent").auth(session.accessToken, { type: "bearer" }).send(fullConsent).expect(204);

    const { rows } = await ctx.pool.query("select consent_at from users where id = $1", [session.user.id]);
    expect(rows[0].consent_at).toBeInstanceOf(Date);

    const login = await ctx.http.post("/auth/login").send({ email, password: PASSWORD }).expect(200);
    expect(login.body.user.hasConsent).toBe(true);
  });

  it.each([
    { privacyPolicy: false, approximateLocation: true },
    { privacyPolicy: true, approximateLocation: false },
    {},
  ])("sem os dois aceites (%o) → 400", async (consent) => {
    const { body: session } = await signUpVerified(ctx);
    await ctx.http.post("/me/consent").auth(session.accessToken, { type: "bearer" }).send(consent).expect(400);
  });

  it("sem token → 401", async () => {
    await ctx.http.post("/me/consent").send(fullConsent).expect(401);
  });

  it("token inválido, expirado ou assinado com outro segredo → 401", async () => {
    const { body: session } = await signUpVerified(ctx);
    const secret = testConfig().jwtSecret;
    const expired = new JwtService({ secret }).sign({ sub: session.user.id }, { expiresIn: -10 });
    const forged = new JwtService({ secret: "x".repeat(40) }).sign({ sub: session.user.id });

    for (const token of ["lixo", expired, forged]) {
      await ctx.http.post("/me/consent").auth(token, { type: "bearer" }).send(fullConsent).expect(401);
    }
  });

  it("o refresh token não serve como access token", async () => {
    const { body: session } = await signUpVerified(ctx);
    await ctx.http.post("/me/consent").auth(session.refreshToken, { type: "bearer" }).send(fullConsent).expect(401);
  });
});
