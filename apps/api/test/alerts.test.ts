import { encodeGeohash, minutesToTime, type AlertItem, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import type { AlertQueue } from "../src/alerts/alert-queue";
import { AlertsService } from "../src/alerts/alerts.service";
import { ALERT_QUEUE } from "../src/tokens";
import { closeTestApp, createTestApp, expectNoPrivateData, signUpVerified, type TestContext } from "./helpers";

let ctx: TestContext;
let queue: AlertQueue;

beforeAll(async () => {
  ctx = await createTestApp();
  queue = ctx.app.get<AlertQueue>(ALERT_QUEUE);
});

afterAll(() => closeTestApp(ctx));

/** Ponto sorteado longe dos outros testes (todos os arquivos usam o mesmo banco). */
function uniqueSpot(): LatLng {
  const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
  return { lat: round6(-50 + Math.random() * 100), lng: round6(-170 + Math.random() * 340) };
}

function offset(p: LatLng, northMeters: number, eastMeters = 0): LatLng {
  const lat = p.lat + northMeters / 111_195;
  const lng = p.lng + eastMeters / (111_195 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6 };
}

let tokenSeq = 0;

async function tutor() {
  const { body, email } = await signUpVerified(ctx);
  const auth = { Authorization: `Bearer ${body.accessToken}` };
  const pushToken = `ExponentPushToken[teste${Date.now()}x${tokenSeq++}]`;
  return {
    auth,
    email,
    user: body.user,
    pushToken,
    putLocation: (payload: unknown) => ctx.http.put("/me/location").set(auth).send(payload as object),
    /** Como o app faz: calcula o geohash no aparelho e manda só ele. */
    at: async (p: LatLng) => ctx.http.put("/me/location").set(auth).send({ geohash: encodeGeohash(p.lat, p.lng, 6) }).expect(204),
    registerPush: async () => ctx.http.post("/me/push-token").set(auth).send({ token: pushToken }).expect(204),
    prefs: (payload: object) => ctx.http.put("/me/alert-preferences").set(auth).send(payload),
    getPrefs: () => ctx.http.get("/me/alert-preferences").set(auth),
    alerts: async () => (await ctx.http.get("/me/alerts").set(auth).expect(200)).body as AlertItem[],
    create: async (p: LatLng, data: object = {}) =>
      (await ctx.http.post("/occurrences").set(auth).send({ type: "lost", species: "dog", petName: "Thor", ...p, ...data }).expect(201))
        .body as PublicOccurrence,
  };
}

const pushesTo = (token: string) => ctx.push.sent.filter((m) => m.to === token);

describe("PUT /me/location (AL-06)", () => {
  it("grava só o último geohash e a hora; atualizar substitui (sem histórico)", async () => {
    const t = await tutor();
    const p = uniqueSpot();
    await t.at(p);
    await t.at(offset(p, 5_000));

    const { rows } = await ctx.pool.query("select * from user_locations where user_id = $1", [t.user.id]);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual(["geohash", "updated_at", "user_id"]);
    expect(rows[0].geohash).toBe(encodeGeohash(offset(p, 5_000).lat, offset(p, 5_000).lng, 6));
  });

  it("recusa coordenada, geohash com outra precisão ou campos extras (400)", async () => {
    const t = await tutor();
    const p = uniqueSpot();
    for (const payload of [
      { lat: p.lat, lng: p.lng },
      { geohash: encodeGeohash(p.lat, p.lng, 6), lat: p.lat, lng: p.lng },
      { geohash: encodeGeohash(p.lat, p.lng, 7) },
      { geohash: encodeGeohash(p.lat, p.lng, 5) },
      { geohash: "6GYF4B" },
      {},
    ]) {
      await t.putLocation(payload).expect(400);
    }
    const { rows } = await ctx.pool.query("select 1 from user_locations where user_id = $1", [t.user.id]);
    expect(rows).toHaveLength(0);
  });

  it("sem login → 401", async () => {
    await ctx.http.put("/me/location").send({ geohash: "6gyf4b" }).expect(401);
  });

  it("inspeção do banco: nenhuma coordenada do usuário em lugar nenhum", async () => {
    const t = await tutor();
    const p = uniqueSpot();
    await t.at(p);

    // Só as ocorrências e o "minha localização" do chat têm colunas geográficas; nada da S5 guarda ponto do usuário.
    // O ponto do chat é enviado pela própria pessoa (CH-05) e gravado já deslocado (`publicPoint`): ver chat.test.ts.
    const { rows: geoColumns } = await ctx.pool.query<{ table_name: string; column_name: string }>(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' and udt_name in ('geography', 'geometry') order by 1, 2`,
    );
    expect(geoColumns).toEqual([
      { table_name: "chat_messages", column_name: "location" },
      { table_name: "occurrences", column_name: "location" },
      { table_name: "occurrences", column_name: "public_location" },
    ]);
    // Nem número que pareça coordenada nas tabelas dos alertas.
    const { rows: numeric } = await ctx.pool.query(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public' and table_name in ('user_locations', 'alert_preferences', 'push_tokens', 'alerts')
          and data_type in ('double precision', 'real', 'numeric')`,
    );
    expect(numeric).toEqual([]);
    // E o texto exato da coordenada não aparece em nenhuma linha do usuário.
    const { rows } = await ctx.pool.query(
      `select row_to_json(u)::text as u, row_to_json(l)::text as l
         from users u left join user_locations l on l.user_id = u.id where u.id = $1`,
      [t.user.id],
    );
    const dump = JSON.stringify(rows);
    expect(dump).not.toContain(String(p.lat));
    expect(dump).not.toContain(String(p.lng));
  });

  it("o geohash do app bate com o do PostGIS (st_geohash)", async () => {
    for (let i = 0; i < 20; i++) {
      const p = uniqueSpot();
      const { rows } = await ctx.pool.query<{ h: string }>("select st_geohash(st_setsrid(st_makepoint($1, $2), 4326), 6) as h", [
        p.lng,
        p.lat,
      ]);
      expect(encodeGeohash(p.lat, p.lng, 6)).toBe(rows[0].h);
    }
  });
});

describe("GET/PUT /me/alert-preferences (AL-04)", () => {
  it("padrão: ligado, 3 km, sem silêncio", async () => {
    const t = await tutor();
    expect((await t.getPrefs().expect(200)).body).toEqual({ enabled: true, radiusKm: 3, quietHours: null });
  });

  it("salva e devolve raio, silêncio que atravessa a meia-noite e desligado", async () => {
    const t = await tutor();
    const prefs = { enabled: false, radiusKm: 5, quietHours: { start: "22:00", end: "07:00" } };
    expect((await t.prefs(prefs).expect(200)).body).toEqual(prefs);
    expect((await t.getPrefs().expect(200)).body).toEqual(prefs);

    await t.prefs({ enabled: true, radiusKm: 1, quietHours: null }).expect(200);
    expect((await t.getPrefs().expect(200)).body).toEqual({ enabled: true, radiusKm: 1, quietHours: null });
  });

  it("dados inválidos → 400 com erros por campo", async () => {
    const t = await tutor();
    const res = await t.prefs({ enabled: true, radiusKm: 2, quietHours: { start: "22:00", end: "7h" } }).expect(400);
    expect(res.body.errors).toEqual({ radiusKm: "Escolha um raio de 1, 3 ou 5 km", quietEnd: "Use o formato HH:MM (ex.: 22:00)" });
  });
});

describe("POST /me/push-token", () => {
  it("registra o token do Expo; formato errado → 400", async () => {
    const t = await tutor();
    await t.registerPush();
    await ctx.http.post("/me/push-token").set(t.auth).send({ token: "fcm:abc" }).expect(400);
    const { rows } = await ctx.pool.query("select token from push_tokens where user_id = $1", [t.user.id]);
    expect(rows.map((r) => r.token)).toEqual([t.pushToken]);
  });

  it("o mesmo aparelho com outra conta passa a ser só da nova conta", async () => {
    const a = await tutor();
    const b = await tutor();
    await a.registerPush();
    await ctx.http.post("/me/push-token").set(b.auth).send({ token: a.pushToken }).expect(204);
    const { rows } = await ctx.pool.query("select user_id from push_tokens where token = $1", [a.pushToken]);
    expect(rows.map((r) => r.user_id)).toEqual([b.user.id]);
  });

  it("DELETE remove o token (ao sair da conta)", async () => {
    const t = await tutor();
    await t.registerPush();
    await ctx.http.delete("/me/push-token").set(t.auth).send({ token: t.pushToken }).expect(204);
    const { rows } = await ctx.pool.query("select 1 from push_tokens where token = $1", [t.pushToken]);
    expect(rows).toHaveLength(0);
  });
});

/** Minutos desde a meia-noite em São Paulo agora. */
function saoPauloMinutesNow(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(
    new Date(),
  );
  return Number(parts.find((x) => x.type === "hour")!.value) * 60 + Number(parts.find((x) => x.type === "minute")!.value);
}

describe("disparo ao criar ocorrência (AL-01, AL-04, AL-05, AL-07)", () => {
  it("só quem está no raio escolhido recebe; autor, desligado, longe e localização antiga ficam de fora", async () => {
    const author = await tutor();
    const center = uniqueSpot();
    // Pontos sempre a norte/sul (a ~1 km do centro da célula não muda o resultado de nenhum caso).
    const near = await tutor(); // mesma região, raio padrão 3 km
    const at6kmRadius3 = await tutor();
    const at4kmRadius5 = await tutor();
    const disabled = await tutor();
    const far = await tutor();
    const stale = await tutor();

    await author.at(center);
    await near.at(offset(center, 300));
    await at6kmRadius3.at(offset(center, 6_000));
    await at4kmRadius5.at(offset(center, -4_500));
    await disabled.at(offset(center, 200));
    await far.at(offset(center, 20_000));
    await stale.at(offset(center, 100));
    await at4kmRadius5.prefs({ enabled: true, radiusKm: 5, quietHours: null }).expect(200);
    await disabled.prefs({ enabled: false, radiusKm: 5, quietHours: null }).expect(200);
    await ctx.pool.query("update user_locations set updated_at = now() - interval '40 days' where user_id = $1", [stale.user.id]);
    for (const t of [author, near, at6kmRadius3, at4kmRadius5, disabled, far, stale]) await t.registerPush();

    const occurrence = await author.create(center, { approxAddress: "Perto da praça" });
    await queue.onIdle();

    const { rows } = await ctx.pool.query<{ user_id: string }>("select user_id from alerts where occurrence_id = $1", [occurrence.id]);
    expect(rows.map((r) => r.user_id).sort()).toEqual([near.user.id, at4kmRadius5.user.id].sort());

    for (const t of [author, at6kmRadius3, disabled, far, stale]) expect(pushesTo(t.pushToken)).toEqual([]);
    const [push] = pushesTo(near.pushToken);
    expect(push).toEqual({
      to: near.pushToken,
      title: "Pet perdido perto de você",
      body: expect.stringContaining("Thor (cão) · a "),
      data: { occurrenceId: occurrence.id, alertId: expect.any(String) },
    });
    expect(pushesTo(at4kmRadius5.pushToken)).toHaveLength(1);
    expectNoPrivateData(ctx.push.sent, author.email);
  });

  it("no horário de silêncio o alerta fica na lista, mas sem push", async () => {
    const author = await tutor();
    const quiet = await tutor();
    const center = uniqueSpot();
    await quiet.at(offset(center, 100));
    await quiet.registerPush();
    const now = saoPauloMinutesNow();
    await quiet
      .prefs({ enabled: true, radiusKm: 1, quietHours: { start: minutesToTime((now + 1380) % 1440), end: minutesToTime((now + 60) % 1440) } })
      .expect(200);

    const occurrence = await author.create(center);
    await queue.onIdle();

    expect((await quiet.alerts()).map((a) => a.occurrenceId)).toEqual([occurrence.id]);
    expect(pushesTo(quiet.pushToken)).toEqual([]);
  });

  it("AL-05: nunca mais de 1 alerta por usuário por ocorrência, mesmo disparando de novo", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 100));
    await neighbor.registerPush();

    const occurrence = await author.create(center);
    await queue.onIdle();
    await ctx.app.get(AlertsService).dispatchForOccurrence(occurrence.id);
    queue.occurrenceCreated(occurrence.id);
    await queue.onIdle();

    expect(await neighbor.alerts()).toHaveLength(1);
    expect(pushesTo(neighbor.pushToken)).toHaveLength(1);

    // A garantia é do banco, não só do código.
    await expect(
      ctx.pool.query("insert into alerts (user_id, occurrence_id, distance_meters) values ($1, $2, 0)", [neighbor.user.id, occurrence.id]),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("não bloqueia a resposta do POST /occurrences enquanto o push está pendente", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 100));
    await neighbor.registerPush();

    ctx.push.hold();
    try {
      const occurrence = await author.create(center);
      expect(pushesTo(neighbor.pushToken)).toEqual([]);
      ctx.push.release();
      await queue.onIdle();
      expect(pushesTo(neighbor.pushToken).map((m) => m.data.occurrenceId)).toEqual([occurrence.id]);
    } finally {
      ctx.push.release();
    }
  });

  it("token que o Expo diz não existir mais é apagado", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 100));
    await neighbor.registerPush();
    ctx.push.invalidTokens.add(neighbor.pushToken);

    await author.create(center);
    await queue.onIdle();

    const { rows } = await ctx.pool.query("select 1 from push_tokens where token = $1", [neighbor.pushToken]);
    expect(rows).toHaveLength(0);
  });

  it("AL-07: sem push token (ou sem permissão em segundo plano) o alerta continua aparecendo na lista", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 100));

    const occurrence = await author.create(center);
    await queue.onIdle();
    expect((await neighbor.alerts()).map((a) => a.occurrenceId)).toEqual([occurrence.id]);
  });
});

describe("GET /me/alerts e POST /me/alerts/:id/seen", () => {
  it("lista os alertas, mais recentes primeiro, só com dados públicos; marca como visto", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 300));

    const first = await author.create(center, { petName: "Thor", approxAddress: "Perto da praça" });
    await queue.onIdle();
    const second = await author.create(offset(center, 200), { type: "seen", species: "cat", petName: "" });
    await queue.onIdle();

    const list = await neighbor.alerts();
    expect(list.map((a) => a.occurrenceId)).toEqual([second.id, first.id]);
    expect(list[1]).toEqual({
      id: expect.any(String),
      occurrenceId: first.id,
      distanceMeters: expect.any(Number),
      createdAt: expect.any(String),
      seenAt: null,
      occurrence: {
        type: "lost",
        species: "dog",
        petName: "Thor",
        breed: null,
        color: null,
        approxAddress: "Perto da praça",
        status: "open",
        createdAt: first.createdAt,
        photoUrl: null,
      },
    });
    expect(list[1].distanceMeters).toBeLessThan(2_000);
    const json = JSON.stringify(list);
    expect(json).not.toContain(String(center.lat));
    expect(json).not.toMatch(/"lat"|"lng"|location|pseudonym/);
    expectNoPrivateData(list, author.email);

    await ctx.http.post(`/me/alerts/${list[1].id}/seen`).set(neighbor.auth).expect(204);
    const after = await neighbor.alerts();
    expect(after[1].seenAt).toEqual(expect.any(String));
    expect(after[0].seenAt).toBeNull();
  });

  it("alerta de outra pessoa ou id inválido → 404", async () => {
    const author = await tutor();
    const neighbor = await tutor();
    const other = await tutor();
    const center = uniqueSpot();
    await neighbor.at(offset(center, 100));
    await author.create(center);
    await queue.onIdle();
    const [alert] = await neighbor.alerts();

    await ctx.http.post(`/me/alerts/${alert.id}/seen`).set(other.auth).expect(404);
    await ctx.http.post("/me/alerts/nao-e-uuid/seen").set(other.auth).expect(404);
  });

  it("sem alertas → lista vazia", async () => {
    const t = await tutor();
    expect(await t.alerts()).toEqual([]);
  });
});

describe("\"Vi este pet\": avistamento ligado a um pet perdido", () => {
  const sight = (t: Awaited<ReturnType<typeof tutor>>, p: LatLng, data: object) =>
    ctx.http.post("/occurrences").set(t.auth).send({ type: "seen", species: "dog", ...p, ...data });

  it("avisa o tutor na hora, em qualquer distância, com push próprio que abre o avistamento", async () => {
    const owner = await tutor();
    const witness = await tutor();
    const home = uniqueSpot();
    await owner.registerPush(); // o tutor nem precisa ter região salva
    const lost = await owner.create(home, { approxAddress: "Vila Mariana" });
    await queue.onIdle();

    const res = await sight(witness, offset(home, 15_000), { sightingOf: lost.id, approxAddress: "Perto do metrô" }).expect(201);
    await queue.onIdle();

    const alerts = await owner.alerts();
    expect(alerts.map((a) => a.occurrenceId)).toEqual([res.body.id]);
    expect(pushesTo(owner.pushToken)).toEqual([
      {
        to: owner.pushToken,
        title: "Alguém viu o Thor!",
        body: expect.stringMatching(/^Avistado a ~1[45],?\d* km de onde sumiu · Perto do metrô$/),
        data: { occurrenceId: res.body.id, alertId: alerts[0].id },
      },
    ]);
    expectNoPrivateData(ctx.push.sent, witness.email);
  });

  it("tutor perto do avistamento recebe só o push do avistamento (sem o alerta genérico repetido)", async () => {
    const owner = await tutor();
    const witness = await tutor();
    const home = uniqueSpot();
    await owner.at(home);
    await owner.registerPush();
    const lost = await owner.create(home);
    await queue.onIdle();

    await sight(witness, offset(home, 200), { sightingOf: lost.id }).expect(201);
    await queue.onIdle();

    expect(pushesTo(owner.pushToken).map((m) => m.title)).toEqual(["Alguém viu o Thor!"]);
    expect(await owner.alerts()).toHaveLength(1);
  });

  it("recusa: tipo diferente de avistado, o próprio pet, ocorrência que não é de perdido ou que não existe", async () => {
    const owner = await tutor();
    const witness = await tutor();
    const home = uniqueSpot();
    const lost = await owner.create(home);
    const seen = await owner.create(home, { type: "seen" });

    await ctx.http.post("/occurrences").set(witness.auth).send({ type: "found", species: "dog", ...home, sightingOf: lost.id }).expect(400);
    await sight(owner, home, { sightingOf: lost.id }).expect(400);
    await sight(witness, home, { sightingOf: seen.id }).expect(404);
    await sight(witness, home, { sightingOf: "00000000-0000-4000-8000-000000000000" }).expect(404);
    await sight(witness, home, { sightingOf: "nao-e-uuid" }).expect(404);
    // Pet já reencontrado: não aceita mais avistamento.
    await ctx.http.post(`/occurrences/${lost.id}/resolve`).set(owner.auth).expect(200);
    await sight(witness, home, { sightingOf: lost.id }).expect(404);
  });
});
