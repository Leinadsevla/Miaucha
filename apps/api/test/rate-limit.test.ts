import { closeTestApp, createTestApp, uniqueEmail, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp({ throttle: { ttlMs: 60_000, limit: 3 } });
});

afterAll(() => closeTestApp(ctx));

describe("rate limit nas rotas de autenticação (NF-04)", () => {
  it.each(["/auth/login", "/auth/signup", "/auth/verify-email", "/auth/resend-code", "/auth/google", "/auth/refresh"])(
    "%s: passou do limite → 429",
    async (route) => {
      for (let i = 0; i < 3; i++) {
        const res = await ctx.http.post(route).send({ email: uniqueEmail() });
        expect(res.status).not.toBe(429);
      }
      const res = await ctx.http.post(route).send({ email: uniqueEmail() }).expect(429);
      expect(res.body.message).toBe("Muitas tentativas. Espere um pouco e tente de novo.");
    },
  );
});
