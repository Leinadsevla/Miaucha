import { closeTestApp, createTestApp, expectNoPrivateData, signUpVerified, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

describe("GET /me (perfil do próprio usuário)", () => {
  it("devolve nome, pseudônimo e os contadores de pets e ocorrências, sem e-mail", async () => {
    const { email, body } = await signUpVerified(ctx, undefined, "Ana Souza");
    const auth = { Authorization: `Bearer ${body.accessToken}` };

    const empty = await ctx.http.get("/me").set(auth).expect(200);
    expect(empty.body).toEqual({ id: body.user.id, name: "Ana Souza", pseudonym: body.user.pseudonym, petCount: 0, occurrenceCount: 0 });

    await ctx.http.post("/pets").set(auth).send({ name: "Thor", species: "dog" }).expect(201);
    for (let i = 0; i < 2; i++) {
      await ctx.http.post("/occurrences").set(auth).send({ type: "seen", species: "cat", lat: -10 + i, lng: 20 }).expect(201);
    }

    const res = await ctx.http.get("/me").set(auth).expect(200);
    expect(res.body).toMatchObject({ petCount: 1, occurrenceCount: 2 });
    expectNoPrivateData(res.body, email);
  });

  it("sem login → 401", async () => {
    await ctx.http.get("/me").expect(401);
  });
});
