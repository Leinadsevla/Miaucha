import { closeTestApp, createTestApp, signUpVerified, uniqueEmail, type TestContext } from "./helpers";

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

describe("rate limit na criação de pets (NF-04)", () => {
  // App próprio: o bloco anterior já esgotou o limite de /auth/signup no `ctx`.
  let pets: TestContext;

  beforeAll(async () => {
    pets = await createTestApp({ throttle: { ttlMs: 60_000, limit: 3 } });
  });

  afterAll(() => closeTestApp(pets));

  it("POST /pets: passou do limite → 429", async () => {
    const ctx = pets;
    const { body } = await signUpVerified(ctx);
    const auth = { Authorization: `Bearer ${body.accessToken}` };
    for (let i = 0; i < 3; i++) await ctx.http.post("/pets").set(auth).send({ name: `Pet ${i}`, species: "cat" }).expect(201);
    await ctx.http.post("/pets").set(auth).send({ name: "Mais um", species: "cat" }).expect(429);
  });
});
