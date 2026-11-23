import { closeTestApp, createTestApp, type TestContext } from "./helpers";

describe("GET /health (verificação do Render)", () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => closeTestApp(ctx));

  it("responde 200 sem login quando o banco está acessível", async () => {
    const res = await ctx.http.get("/health").expect(200);
    expect(res.body).toEqual({ status: "ok" });
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
