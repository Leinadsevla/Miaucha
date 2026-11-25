import { distanceMeters, type OccurrenceInput, type PublicOccurrence } from "@miaucha/shared";
import { createApiSession, type FetchLike } from "@/features/auth/apiSession";
import type { SessionStorage, StoredSession } from "@/features/auth/sessionStorage";
import type { Uploader } from "@/features/pets/petsClient";
import {
  createHttpOccurrencesClient,
  createMockOccurrencesClient,
  saveOccurrence,
  updateOccurrence,
  type OccurrencesClient,
} from "../occurrencesClient";

type Call = { method: string; path: string; body: unknown; authorization?: string };

function setup(routes: Record<string, (call: Call) => { status: number; body?: unknown }>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call = {
      method: init.method,
      path: url.replace("https://api.teste", ""),
      body: init.body ? JSON.parse(init.body) : undefined,
      authorization: init.headers.Authorization,
    };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    if (!handler) throw new Error(`rota não esperada: ${call.method} ${call.path}`);
    const reply = handler(call);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
  };
  let current: StoredSession | null = { accessToken: "access", refreshToken: "refresh", user: { id: "u1", name: "Ana", hasConsent: true } };
  const storage: SessionStorage = { load: async () => current, save: async (s) => void (current = s), clear: async () => void (current = null) };
  const uploads: { url: string; uri: string; contentType: string }[] = [];
  const upload: Uploader = async (url, photo, contentType) => void uploads.push({ url, uri: photo.uri, contentType });
  const client = createHttpOccurrencesClient({ session: createApiSession({ baseUrl: "https://api.teste", storage, fetch }), upload });
  return { client, calls, uploads };
}

const thor: PublicOccurrence = {
  id: "o1",
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: null,
  color: null,
  description: null,
  photoUrls: [],
  publicLocation: { lat: -23.56, lng: -46.65 },
  approxAddress: null,
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: true,
  createdAt: "2026-11-20T12:00:00Z",
};

const input: OccurrenceInput = {
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: "",
  color: "",
  description: "",
  approxAddress: "",
  lat: -23.5614,
  lng: -46.6559,
};

describe("createHttpOccurrencesClient", () => {
  it("nearby faz GET autenticado com lat, lng e radiusKm", async () => {
    const { client, calls } = setup({ "GET /occurrences?lat=-23.5&lng=-46.6&radiusKm=5": () => ({ status: 200, body: [thor] }) });
    expect(await client.nearby({ lat: -23.5, lng: -46.6, radiusKm: 5 })).toEqual([thor]);
    expect(calls[0].authorization).toBe("Bearer access");
  });

  it("inArea faz GET com bbox e só os filtros informados (MP-02, MP-05)", async () => {
    const { client } = setup({
      "GET /occurrences?bbox=-46.65000,-23.56000,-46.61000,-23.54000&sinceDays=30": () => ({ status: 200, body: [thor] }),
      "GET /occurrences?bbox=-46.65000,-23.56000,-46.61000,-23.54000&type=seen&species=cat&sinceDays=1": () => ({ status: 200, body: [] }),
    });
    const bbox = { minLng: -46.65, minLat: -23.56, maxLng: -46.61, maxLat: -23.54 };
    expect(await client.inArea({ bbox, sinceDays: 30 })).toEqual([thor]);
    expect(await client.inArea({ bbox, type: "seen", species: "cat", sinceDays: 1 })).toEqual([]);
  });

  it("get, listMine e resolve", async () => {
    const { client, calls } = setup({
      "GET /occurrences/o1": () => ({ status: 200, body: thor }),
      "GET /me/occurrences": () => ({ status: 200, body: [thor] }),
      "POST /occurrences/o1/resolve": () => ({ status: 200, body: { ...thor, status: "resolved" } }),
    });
    expect(await client.get("o1")).toEqual(thor);
    expect(await client.listMine()).toEqual([thor]);
    expect((await client.resolve("o1")).status).toBe("resolved");
    expect(calls.map((c) => c.method)).toEqual(["GET", "GET", "POST"]);
  });

  it("create envia os dados do formulário (inclusive o ponto real, que só a API vê)", async () => {
    const { client, calls } = setup({ "POST /occurrences": () => ({ status: 201, body: thor }) });
    expect(await client.create({ ...input, petId: "p1" })).toEqual(thor);
    expect(calls[0].body).toEqual({ ...input, petId: "p1" });
  });

  it("addPhoto: pede a URL, envia o arquivo direto ao storage e confirma", async () => {
    const { client, calls, uploads } = setup({
      "POST /occurrences/o1/photos": () => ({ status: 201, body: { photoId: "f1", uploadUrl: "https://storage/assinada", expiresInSeconds: 300 } }),
      "POST /occurrences/o1/photos/f1/confirm": () => ({ status: 200, body: { id: "f1", url: "https://storage/leitura" } }),
    });
    expect(await client.addPhoto("o1", { uri: "file:///foto.jpg" })).toEqual({ id: "f1", url: "https://storage/leitura" });
    expect(uploads).toEqual([{ url: "https://storage/assinada", uri: "file:///foto.jpg", contentType: "image/jpeg" }]);
    expect(calls.map((c) => c.path)).toEqual(["/occurrences/o1/photos", "/occurrences/o1/photos/f1/confirm"]);
  });

  it("update faz PATCH com os dados e só manda lat/lng quando há local novo; removePhoto faz DELETE", async () => {
    const { client, calls } = setup({
      "PATCH /occurrences/o1": () => ({ status: 200, body: thor }),
      "DELETE /occurrences/o1/photos/f1": () => ({ status: 204 }),
    });
    const data = { species: "cat" as const, petName: "Mia", breed: "", color: "", description: "", approxAddress: "Praça" };
    await client.update("o1", data);
    await client.update("o1", { ...data, location: { lat: -23.5, lng: -46.6 } });
    await client.removePhoto("o1", "f1");
    expect(calls[0].body).toEqual(data);
    expect(calls[1].body).toEqual({ ...data, lat: -23.5, lng: -46.6 });
    expect(calls[2]).toMatchObject({ method: "DELETE", path: "/occurrences/o1/photos/f1" });
  });

  it("erro da API chega com a mensagem dela", async () => {
    const { client } = setup({ "POST /occurrences": () => ({ status: 400, body: { message: "x", errors: { petName: "Informe o nome do pet" } } }) });
    await expect(client.create(input)).rejects.toThrow("Informe o nome do pet");
  });
});

function fakeClient(failOn: string[] = []): OccurrencesClient & { added: string[] } {
  const added: string[] = [];
  return {
    added,
    nearby: async () => [],
    inArea: async () => [],
    get: async () => thor,
    listMine: async () => [],
    resolve: async () => thor,
    create: async () => thor,
    update: async () => thor,
    removePhoto: async (_id, photoId) => {
      if (failOn.includes(photoId)) throw new Error("falhou");
      added.push(`-${photoId}`);
    },
    addPhoto: async (_id, photo) => {
      if (failOn.includes(photo.uri)) throw new Error("falhou");
      added.push(photo.uri);
      return { id: photo.uri, url: photo.uri };
    },
  };
}


describe("saveOccurrence", () => {
  it("cria e envia as fotos em ordem", async () => {
    const client = fakeClient();
    const result = await saveOccurrence(client, input, [{ uri: "a.jpg" }, { uri: "b.jpg" }]);
    expect(result).toEqual({ occurrence: { ...thor, photoUrls: ["a.jpg", "b.jpg"] }, failedPhotos: 0 });
    expect(client.added).toEqual(["a.jpg", "b.jpg"]);
  });

  it("uma foto que falha não desfaz a ocorrência", async () => {
    const result = await saveOccurrence(fakeClient(["a.jpg"]), input, [{ uri: "a.jpg" }, { uri: "b.jpg" }]);
    expect(result.failedPhotos).toBe(1);
    expect(result.occurrence.photoUrls).toEqual(["b.jpg"]);
  });
});

describe("updateOccurrence", () => {
  const data = { species: "dog" as const, petName: "Thor", breed: "", color: "", description: "", approxAddress: "" };

  it("salva os dados, remove as fotos marcadas e envia as novas", async () => {
    const client = fakeClient();
    const result = await updateOccurrence(client, "o1", data, [{ uri: "c.jpg" }], ["f1"]);
    expect(result.failedPhotos).toBe(0);
    expect(client.added).toEqual(["-f1", "c.jpg"]);
  });

  it("foto que falha não desfaz o resto", async () => {
    const result = await updateOccurrence(fakeClient(["f1", "c.jpg"]), "o1", data, [{ uri: "c.jpg" }], ["f1"]);
    expect(result.failedPhotos).toBe(2);
  });
});

describe("createMockOccurrencesClient", () => {
  it("cria com ponto público deslocado, acha por raio e marca como resolvida", async () => {
    const client = createMockOccurrencesClient({ seed: false });
    const created = await client.create(input);
    const d = distanceMeters({ lat: input.lat, lng: input.lng }, created.publicLocation);
    expect(d).toBeGreaterThanOrEqual(50);
    expect(d).toBeLessThanOrEqual(200);
    expect(created).toMatchObject({ isMine: true, status: "open", petName: "Thor" });

    const found = await client.nearby({ lat: input.lat, lng: input.lng, radiusKm: 1 });
    expect(found.map((o) => o.id)).toEqual([created.id]);
    expect(found[0].distanceMeters).toBeCloseTo(d, 0);
    expect(await client.nearby({ lat: 0, lng: 0, radiusKm: 1 })).toEqual([]);

    await client.resolve(created.id);
    expect(await client.nearby({ lat: input.lat, lng: input.lng, radiusKm: 1 })).toEqual([]);
    expect((await client.listMine())[0].status).toBe("resolved");
  });

  it("com seed, a primeira busca já mostra exemplos perto do usuário (dev sem API)", async () => {
    const client = createMockOccurrencesClient();
    const found = await client.nearby({ lat: 10, lng: 10, radiusKm: 5 });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((o) => !o.isMine)).toBe(true);
  });

  it("inArea devolve só as abertas dentro da área e que passam nos filtros", async () => {
    const client = createMockOccurrencesClient({ seed: false });
    const created = await client.create(input);
    const around = { minLng: input.lng - 0.01, minLat: input.lat - 0.01, maxLng: input.lng + 0.01, maxLat: input.lat + 0.01 };
    expect((await client.inArea({ bbox: around })).map((o) => o.id)).toEqual([created.id]);
    expect(await client.inArea({ bbox: around, type: "seen" })).toEqual([]);
    expect(await client.inArea({ bbox: around, species: "cat" })).toEqual([]);
    expect(await client.inArea({ bbox: { minLng: 0, minLat: 0, maxLng: 1, maxLat: 1 } })).toEqual([]);
  });

  it("com seed, a primeira busca por área também mostra exemplos no centro dela", async () => {
    const client = createMockOccurrencesClient();
    const found = await client.inArea({ bbox: { minLng: 9.9, minLat: 9.9, maxLng: 10.1, maxLat: 10.1 } });
    expect(found.length).toBeGreaterThan(0);
  });

  it("get de id desconhecido → erro", async () => {
    await expect(createMockOccurrencesClient().get("nada")).rejects.toThrow("Ocorrência não encontrada");
  });
});
