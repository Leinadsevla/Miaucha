import type { AlertItem } from "@miaucha/shared";
import { createApiSession, type FetchLike } from "@/features/auth/apiSession";
import type { SessionStorage, StoredSession } from "@/features/auth/sessionStorage";
import { createHttpAlertsClient, createMockAlertsClient } from "../alertsClient";

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
  const client = createHttpAlertsClient({ session: createApiSession({ baseUrl: "https://api.teste", storage, fetch }) });
  return { client, calls };
}

const alert: AlertItem = {
  id: "a1",
  occurrenceId: "o1",
  distanceMeters: 800,
  createdAt: "2026-11-20T12:00:00Z",
  seenAt: null,
  occurrence: {
    type: "lost",
    species: "dog",
    petName: "Thor",
    breed: null,
    color: null,
    approxAddress: null,
    status: "open",
    createdAt: "2026-11-20T12:00:00Z",
    photoUrl: null,
  },
};

describe("createHttpAlertsClient", () => {
  it("lista os alertas e marca como visto, autenticado", async () => {
    const { client, calls } = setup({
      "GET /me/alerts": () => ({ status: 200, body: [alert] }),
      "POST /me/alerts/a1/seen": () => ({ status: 204 }),
    });
    expect(await client.list()).toEqual([alert]);
    await client.markSeen("a1");
    expect(calls.map((c) => c.authorization)).toEqual(["Bearer access", "Bearer access"]);
  });

  it("lê e salva as preferências (PUT)", async () => {
    const prefs = { enabled: true, radiusKm: 5 as const, quietHours: { start: "22:00", end: "07:00" } };
    const { client, calls } = setup({
      "GET /me/alert-preferences": () => ({ status: 200, body: { enabled: true, radiusKm: 3, quietHours: null } }),
      "PUT /me/alert-preferences": (call) => ({ status: 200, body: call.body }),
    });
    expect(await client.getPreferences()).toEqual({ enabled: true, radiusKm: 3, quietHours: null });
    expect(await client.savePreferences(prefs)).toEqual(prefs);
    expect(calls[1]).toMatchObject({ method: "PUT", body: prefs });
  });

  it("AL-06: envia só o geohash da região, nunca coordenada", async () => {
    const { client, calls } = setup({ "PUT /me/location": () => ({ status: 204 }) });
    await client.updateLocation("6gyf4b");
    expect(calls[0].body).toEqual({ geohash: "6gyf4b" });
  });

  it("registra e remove o token de push", async () => {
    const { client, calls } = setup({
      "POST /me/push-token": () => ({ status: 204 }),
      "DELETE /me/push-token": () => ({ status: 204 }),
    });
    await client.registerPushToken("ExponentPushToken[abc]");
    await client.removePushToken("ExponentPushToken[abc]");
    expect(calls.map((c) => [c.method, c.body])).toEqual([
      ["POST", { token: "ExponentPushToken[abc]" }],
      ["DELETE", { token: "ExponentPushToken[abc]" }],
    ]);
  });

  it("erro da API vira mensagem para a tela", async () => {
    const { client } = setup({
      "PUT /me/alert-preferences": () => ({ status: 400, body: { message: "x", errors: { radiusKm: "Escolha um raio de 1, 3 ou 5 km" } } }),
    });
    await expect(client.savePreferences({ enabled: true, radiusKm: 3, quietHours: null })).rejects.toThrow("Escolha um raio de 1, 3 ou 5 km");
  });
});

describe("createMockAlertsClient", () => {
  it("guarda preferências, recusa inválidas e marca alertas como vistos", async () => {
    const client = createMockAlertsClient({ alerts: [alert] });
    expect(await client.getPreferences()).toEqual({ enabled: true, radiusKm: 3, quietHours: null });
    await client.savePreferences({ enabled: false, radiusKm: 1, quietHours: null });
    expect(await client.getPreferences()).toEqual({ enabled: false, radiusKm: 1, quietHours: null });
    await expect(client.savePreferences({ enabled: true, radiusKm: 2 as 1, quietHours: null })).rejects.toThrow("Escolha um raio de 1, 3 ou 5 km");

    await client.markSeen("a1");
    expect((await client.list())[0].seenAt).toEqual(expect.any(String));
  });

  it("recusa geohash que não seja de 6 caracteres (mesma regra da API)", async () => {
    const client = createMockAlertsClient();
    await expect(client.updateLocation("6gyf4")).rejects.toThrow();
    await expect(client.updateLocation("6gyf4b")).resolves.toBeUndefined();
  });
});
