import { distanceMeters, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import { closeTestApp, createTestApp, expectNoPrivateData, signUpVerified, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7, 6, 5]);

/**
 * Todos os arquivos de teste usam o mesmo banco: cada teste trabalha num ponto sorteado do planeta,
 * longe dos outros, para as buscas só enxergarem o que ele mesmo criou.
 */
function uniqueSpot(): LatLng {
  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round6(-50 + Math.random() * 100), lng: round6(-170 + Math.random() * 340) };
}

/** Ponto a `meters` ao norte (lat) e `eastMeters` a leste de `p`. */
function offset(p: LatLng, northMeters: number, eastMeters = 0): LatLng {
  const lat = p.lat + northMeters / 111_195;
  const lng = p.lng + eastMeters / (111_195 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

type Tutor = Awaited<ReturnType<typeof tutor>>;

async function tutor() {
  const { body, email } = await signUpVerified(ctx);
  const auth = { Authorization: `Bearer ${body.accessToken}` };
  return {
    auth,
    email,
    user: body.user,
    create: async (at: LatLng, data: object = {}) =>
      (await ctx.http.post("/occurrences").set(auth).send({ type: "lost", species: "dog", petName: "Thor", ...at, ...data }).expect(201))
        .body as PublicOccurrence,
    search: async (query: Record<string, string | number>) =>
      (await ctx.http.get("/occurrences").query(query).set(auth).expect(200)).body as PublicOccurrence[],
    get: (id: string) => ctx.http.get(`/occurrences/${id}`).set(auth),
    mine: async () => (await ctx.http.get("/me/occurrences").set(auth).expect(200)).body as PublicOccurrence[],
    resolve: (id: string) => ctx.http.post(`/occurrences/${id}/resolve`).set(auth).send(),
    requestUpload: (id: string, contentType = "image/jpeg") => ctx.http.post(`/occurrences/${id}/photos`).set(auth).send({ contentType }),
    confirm: (id: string, photoId: string) => ctx.http.post(`/occurrences/${id}/photos/${photoId}/confirm`).set(auth).send(),
  };
}

async function put(uploadUrl: string, body: Buffer, contentType = "image/jpeg") {
  const res = await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": contentType } });
  expect(res.status).toBe(200);
}

async function addPhoto(t: Tutor, id: string, body = jpeg) {
  const req = await t.requestUpload(id).expect(201);
  await put(req.body.uploadUrl, body);
  return t.confirm(id, req.body.photoId).expect(200);
}

/** Nenhum objeto com lat/lng na resposta pode estar a menos de 50 m do ponto real, nem o texto exato dele. */
function expectExactPointHidden(body: unknown, real: LatLng) {
  const json = JSON.stringify(body);
  expect(json).not.toContain(String(real.lat));
  expect(json).not.toContain(String(real.lng));
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const v = value as Record<string, unknown>;
    if (typeof v.lat === "number" && typeof v.lng === "number") {
      expect(distanceMeters(real, { lat: v.lat, lng: v.lng })).toBeGreaterThan(50);
    }
    Object.values(v).forEach(visit);
  };
  visit(body);
  expect(json).not.toContain('"location"');
}

const ids = (list: PublicOccurrence[]) => list.map((o) => o.id);

describe("POST /occurrences", () => {
  it("cria e devolve a ocorrência pública, com pseudônimo e sem a coordenada exata (MP-07, CH-02)", async () => {
    const t = await tutor();
    const real = uniqueSpot();
    const res = await ctx.http
      .post("/occurrences")
      .set(t.auth)
      .send({
        type: "lost",
        species: "dog",
        petName: " Thor ",
        breed: "Golden Retriever",
        color: "Dourado",
        description: "Coleira azul",
        approxAddress: "Av. Paulista, perto do MASP",
        ...real,
      })
      .expect(201);

    expect(res.body).toEqual({
      id: expect.any(String),
      type: "lost",
      species: "dog",
      petName: "Thor",
      breed: "Golden Retriever",
      color: "Dourado",
      description: "Coleira azul",
      approxAddress: "Av. Paulista, perto do MASP",
      photoUrls: [],
      publicLocation: { lat: expect.any(Number), lng: expect.any(Number) },
      authorPseudonym: t.user.pseudonym,
      status: "open",
      isMine: true,
      createdAt: expect.any(String),
    });
    expectNoPrivateData(res.body, t.email);
    expect(JSON.stringify(res.body)).not.toContain(t.user.name);
    expectExactPointHidden(res.body, real);
  });

  it("o ponto público fica entre 50 e 200 m do real e é gerado uma vez só (MP-07)", async () => {
    const t = await tutor();
    const real = uniqueSpot();
    for (let i = 0; i < 10; i++) {
      const created = await t.create(real);
      const d = distanceMeters(real, created.publicLocation);
      expect(d).toBeGreaterThanOrEqual(50);
      expect(d).toBeLessThanOrEqual(200);

      const again = (await t.get(created.id).expect(200)).body as PublicOccurrence;
      expect(again.publicLocation).toEqual(created.publicLocation);
    }
  });

  it("o banco guarda o ponto exato (só a API o vê) e o público separado", async () => {
    const t = await tutor();
    const real = uniqueSpot();
    const created = await t.create(real);
    const { rows } = await ctx.pool.query(
      `select st_y(location::geometry) as lat, st_x(location::geometry) as lng,
              st_distance(location, public_location) as d from occurrences where id = $1`,
      [created.id],
    );
    expect(rows[0].lat).toBeCloseTo(real.lat, 6);
    expect(rows[0].lng).toBeCloseTo(real.lng, 6);
    expect(rows[0].d).toBeGreaterThanOrEqual(50);
    expect(rows[0].d).toBeLessThanOrEqual(200);
  });

  it("avistado e encontrado aceitam pet sem nome", async () => {
    const t = await tutor();
    const created = await t.create(uniqueSpot(), { type: "seen", species: "cat", petName: "" });
    expect(created).toMatchObject({ type: "seen", species: "cat", petName: null, breed: null });
  });

  it("dados inválidos → 400 com as mensagens de validateOccurrence", async () => {
    const t = await tutor();
    const res = await ctx.http.post("/occurrences").set(t.auth).send({ type: "lost", species: "peixe", lat: 200, lng: 0 }).expect(400);
    expect(res.body.errors).toEqual({
      species: "Escolha cão ou gato",
      petName: "Informe o nome do pet",
      location: "Não foi possível obter o local. Ative a localização e tente de novo.",
    });
  });

  it("lat/lng como texto não são aceitos", async () => {
    const t = await tutor();
    const res = await ctx.http.post("/occurrences").set(t.auth).send({ type: "seen", species: "dog", lat: "-23.5", lng: "-46.6" }).expect(400);
    expect(res.body.errors.location).toBeDefined();
  });

  it("sem login → 401", async () => {
    await ctx.http.post("/occurrences").send({ type: "lost", species: "dog", petName: "Thor", ...uniqueSpot() }).expect(401);
  });
});

describe("POST /occurrences com petId (registrar meu pet como perdido)", () => {
  it("preenche com os dados do pet o que faltar e reaproveita as fotos dele", async () => {
    const t = await tutor();
    const pet = (await ctx.http.post("/pets").set(t.auth).send({ name: "Mia", species: "cat", breed: "Persa", color: "Branca" }).expect(201))
      .body;
    const req = await ctx.http.post(`/pets/${pet.id}/photos`).set(t.auth).send({ contentType: "image/jpeg" }).expect(201);
    await put(req.body.uploadUrl, jpeg);
    await ctx.http.post(`/pets/${pet.id}/photos/${req.body.photoId}/confirm`).set(t.auth).send().expect(200);

    const res = await ctx.http
      .post("/occurrences")
      .set(t.auth)
      .send({ type: "lost", petId: pet.id, color: "Branca com manchas", ...uniqueSpot() })
      .expect(201);
    expect(res.body).toMatchObject({ species: "cat", petName: "Mia", breed: "Persa", color: "Branca com manchas" });
    expect(res.body.photoUrls).toHaveLength(1);
    const download = await fetch(res.body.photoUrls[0]);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(jpeg);
  });

  it("pet de outra pessoa, inexistente ou id inválido → 404", async () => {
    const ana = await tutor();
    const bia = await tutor();
    const pet = (await ctx.http.post("/pets").set(ana.auth).send({ name: "Mia", species: "cat" }).expect(201)).body;
    const spot = uniqueSpot();
    await ctx.http.post("/occurrences").set(bia.auth).send({ type: "lost", petId: pet.id, ...spot }).expect(404);
    await ctx.http.post("/occurrences").set(bia.auth).send({ type: "lost", petId: "00000000-0000-0000-0000-000000000000", ...spot }).expect(404);
    await ctx.http.post("/occurrences").set(bia.auth).send({ type: "lost", petId: "nao-e-uuid", ...spot }).expect(404);
  });
});

describe("fotos da ocorrência", () => {
  it("fluxo completo por URL assinada; a foto aparece no detalhe e na busca (capa)", async () => {
    const t = await tutor();
    const spot = uniqueSpot();
    const o = await t.create(spot);
    const confirmed = await addPhoto(t, o.id);
    expect(confirmed.body).toEqual({ id: expect.any(String), url: expect.stringContaining("X-Amz-Signature") });
    await addPhoto(t, o.id);

    const detail = (await t.get(o.id).expect(200)).body as PublicOccurrence;
    expect(detail.photoUrls).toHaveLength(2);
    expect(detail.photoUrls.every((u) => new URL(u).searchParams.get("X-Amz-Signature"))).toBe(true);

    const [found] = await t.search({ lat: spot.lat, lng: spot.lng, radiusKm: 1 });
    expect(found.photoUrls).toHaveLength(1);
  });

  it("valida como nas fotos de pet: tipo, conteúdo, limite de 5 e dono", async () => {
    const t = await tutor();
    const other = await tutor();
    const o = await t.create(uniqueSpot());

    expect((await t.requestUpload(o.id, "image/gif").expect(400)).body.message).toBe("Envie uma foto JPG, PNG ou WebP");

    const fake = await t.requestUpload(o.id).expect(201);
    await put(fake.body.uploadUrl, Buffer.from("File not found"));
    expect((await t.confirm(o.id, fake.body.photoId).expect(400)).body.message).toBe("O arquivo enviado não é uma imagem válida");

    await other.requestUpload(o.id).expect(404);
    await t.requestUpload("nao-e-uuid").expect(404);

    for (let i = 0; i < 5; i++) await addPhoto(t, o.id);
    expect((await t.requestUpload(o.id).expect(400)).body.message).toBe("Cada ocorrência pode ter até 5 fotos");
  });
});

describe("GET /occurrences (MP-02)", () => {
  it("por raio: só o que está dentro, com distanceMeters sobre o ponto público, mais recentes primeiro", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    const near = await t.create(center);
    const nearToo = await t.create(offset(center, 400));
    const far = await t.create(offset(center, 3000));

    const found = await t.search({ lat: center.lat, lng: center.lng, radiusKm: 1 });
    expect(ids(found)).toEqual([nearToo.id, near.id]);
    expect(ids(found)).not.toContain(far.id);
    for (const o of found) {
      expect(o.distanceMeters).toBeCloseTo(distanceMeters(center, o.publicLocation), -1);
      expectExactPointHidden(o, center);
      expectNoPrivateData(o, t.email);
    }
    expect(ids(await t.search({ lat: center.lat, lng: center.lng, radiusKm: 5 }))).toEqual([far.id, nearToo.id, near.id]);
  });

  it("filtra pela localização pública, não pela exata", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    const o = await t.create(center);
    const publicDistance = distanceMeters(center, o.publicLocation);
    // Raio que inclui o ponto real (0 m) mas não o público.
    const radiusKm = (publicDistance - 20) / 1000;
    expect(await t.search({ lat: center.lat, lng: center.lng, radiusKm })).toEqual([]);
    expect(ids(await t.search({ lat: o.publicLocation.lat, lng: o.publicLocation.lng, radiusKm: 0.01 }))).toEqual([o.id]);
  });

  it("por bbox: só o que está dentro da área visível", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    const inside = await t.create(center);
    const outside = await t.create(offset(center, 0, 5000));
    const sw = offset(center, -1500, -1500);
    const ne = offset(center, 1500, 1500);

    const found = await t.search({ bbox: [sw.lng, sw.lat, ne.lng, ne.lat].join(",") });
    expect(ids(found)).toEqual([inside.id]);
    expect(found[0].distanceMeters).toBeUndefined();
    expect(ids(found)).not.toContain(outside.id);
  });

  it("filtros por tipo, espécie e período (MP-05)", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    const lostDog = await t.create(center, { type: "lost", species: "dog" });
    const seenCat = await t.create(center, { type: "seen", species: "cat", petName: "" });
    const oldFound = await t.create(center, { type: "found", species: "dog", petName: "" });
    await ctx.pool.query("update occurrences set created_at = now() - interval '10 days' where id = $1", [oldFound.id]);

    const q = { lat: center.lat, lng: center.lng, radiusKm: 1 };
    expect(ids(await t.search({ ...q, type: "seen" }))).toEqual([seenCat.id]);
    expect(ids(await t.search({ ...q, species: "dog" })).sort()).toEqual([lostDog.id, oldFound.id].sort());
    expect(ids(await t.search({ ...q, sinceDays: 7 })).sort()).toEqual([lostDog.id, seenCat.id].sort());
    expect(ids(await t.search({ ...q, sinceDays: 30, type: "found" }))).toEqual([oldFound.id]);
  });

  it("resolvida e expirada (30 dias sem atualização, NF-03) somem da busca", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    const open = await t.create(center);
    const resolved = await t.create(center);
    const expired = await t.create(center);
    const almost = await t.create(center);
    await t.resolve(resolved.id).expect(200);
    await ctx.pool.query("update occurrences set updated_at = now() - interval '30 days 1 minute' where id = $1", [expired.id]);
    await ctx.pool.query("update occurrences set updated_at = now() - interval '29 days' where id = $1", [almost.id]);

    const found = ids(await t.search({ lat: center.lat, lng: center.lng, radiusKm: 1 }));
    expect(found.sort()).toEqual([open.id, almost.id].sort());
    const sw = offset(center, -1000, -1000);
    const ne = offset(center, 1000, 1000);
    expect(ids(await t.search({ bbox: [sw.lng, sw.lat, ne.lng, ne.lat].join(",") })).sort()).toEqual([open.id, almost.id].sort());
  });

  it("devolve no máximo 200", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    await ctx.pool.query(
      `insert into occurrences (author_id, type, species, pet_name, location, public_location)
       select $1, 'seen', 'dog', null, st_makepoint($3, $2)::geography, st_makepoint($3, $2)::geography
         from generate_series(1, 205)`,
      [t.user.id, center.lat, center.lng],
    );
    expect(await t.search({ lat: center.lat, lng: center.lng, radiusKm: 1 })).toHaveLength(200);
  });

  it("MP-02 (parcial): com 5 mil ocorrências na região, raio e bbox respondem em menos de 300 ms", async () => {
    const t = await tutor();
    const center = uniqueSpot();
    // Espalhadas num quadrado de ~10 km em volta do centro.
    await ctx.pool.query(
      `insert into occurrences (author_id, type, species, location, public_location)
       select $1, (array['lost','seen','found'])[1 + g % 3], (array['dog','cat'])[1 + g % 2], pt, pt
         from (select g, st_setsrid(st_makepoint($3 + (random() - 0.5) * 0.1, $2 + (random() - 0.5) * 0.1), 4326)::geography as pt
                 from generate_series(1, 5000) g) s`,
      [t.user.id, center.lat, center.lng],
    );
    await ctx.pool.query("analyze occurrences");
    const sw = offset(center, -3000, -3000);
    const ne = offset(center, 3000, 3000);
    const timed = async (query: Record<string, string | number>) => {
      const started = performance.now();
      const list = await t.search(query);
      return { ms: performance.now() - started, count: list.length };
    };
    await timed({ lat: center.lat, lng: center.lng, radiusKm: 5 }); // aquece conexões

    const radius = await timed({ lat: center.lat, lng: center.lng, radiusKm: 5 });
    const bbox = await timed({ bbox: [sw.lng, sw.lat, ne.lng, ne.lat].join(",") });
    expect(radius.count).toBe(200);
    expect(bbox.count).toBe(200);
    expect(radius.ms).toBeLessThan(300);
    expect(bbox.ms).toBeLessThan(300);
  });

  it("parâmetros inválidos → 400", async () => {
    const t = await tutor();
    const bad = (query: object) => ctx.http.get("/occurrences").query(query).set(t.auth).expect(400);
    expect((await bad({ lat: 0, lng: 0, radiusKm: 31 })).body.message).toBe("O raio máximo é de 30 km");
    expect((await bad({})).body.message).toBe("Informe lat e lng (com radiusKm) ou bbox");
    expect((await bad({ bbox: "1,2,3" })).body.message).toBe("bbox inválida: use minLng,minLat,maxLng,maxLat");
    await bad({ lat: 0, lng: 0, type: "stolen" });
  });

  it("sem login → 401", async () => {
    await ctx.http.get("/occurrences").query({ lat: 0, lng: 0 }).expect(401);
  });
});

describe("GET /occurrences/:id", () => {
  it("qualquer usuário logado vê o detalhe público; isMine só para o autor", async () => {
    const ana = await tutor();
    const bia = await tutor();
    const real = uniqueSpot();
    const o = await ana.create(real, { description: "Muito dócil" });

    const res = await bia.get(o.id).expect(200);
    expect(res.body).toEqual({ ...o, isMine: false });
    expectNoPrivateData(res.body, ana.email);
    expectExactPointHidden(res.body, real);
    expect((await ana.get(o.id).expect(200)).body.isMine).toBe(true);
  });

  it("inexistente ou id inválido → 404; sem login → 401", async () => {
    const t = await tutor();
    await t.get("00000000-0000-0000-0000-000000000000").expect(404);
    await t.get("nao-e-uuid").expect(404);
    await ctx.http.get("/occurrences/00000000-0000-0000-0000-000000000000").expect(401);
  });
});

describe("GET /me/occurrences", () => {
  it("lista só as do usuário, inclusive resolvidas e expiradas, mais recentes primeiro", async () => {
    const ana = await tutor();
    const bia = await tutor();
    const first = await ana.create(uniqueSpot());
    const second = await ana.create(uniqueSpot());
    await bia.create(uniqueSpot());
    await ana.resolve(first.id).expect(200);
    await ctx.pool.query("update occurrences set updated_at = now() - interval '40 days' where id = $1", [second.id]);

    const mine = await ana.mine();
    expect(ids(mine)).toEqual([second.id, first.id]);
    expect(mine.map((o) => o.status)).toEqual(["open", "resolved"]);
    expect(mine.every((o) => o.isMine)).toBe(true);
    expect(await (await tutor()).mine()).toEqual([]);
  });
});

describe("POST /occurrences/:id/resolve", () => {
  it("o autor marca como resolvida (idempotente)", async () => {
    const t = await tutor();
    const o = await t.create(uniqueSpot());
    const res = await t.resolve(o.id).expect(200);
    expect(res.body).toEqual({ ...o, status: "resolved" });
    await t.resolve(o.id).expect(200);
    const { rows } = await ctx.pool.query("select resolved_at from occurrences where id = $1", [o.id]);
    expect(rows[0].resolved_at).toBeInstanceOf(Date);
  });

  it("outro usuário, inexistente ou id inválido → 404", async () => {
    const ana = await tutor();
    const bia = await tutor();
    const o = await ana.create(uniqueSpot());
    await bia.resolve(o.id).expect(404);
    await bia.resolve("nao-e-uuid").expect(404);
    expect((await ana.get(o.id).expect(200)).body.status).toBe("open");
  });
});
