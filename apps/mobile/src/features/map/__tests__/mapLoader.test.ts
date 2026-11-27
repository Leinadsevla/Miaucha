import type { PublicOccurrence } from "@miaucha/shared";
import { ApiError } from "@/features/auth/apiSession";
import type { AreaQuery } from "@/features/occurrences/occurrencesClient";
import { DEFAULT_MAP_FILTERS } from "../filters";
import type { MapCache, MapSnapshot } from "../mapCache";
import { OFFLINE_MESSAGE, createMapLoader, type MapDataState } from "../mapLoader";
import type { Region } from "../region";

const sp: Region = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.02, longitudeDelta: 0.02 };
const now = new Date("2026-11-20T12:00:00Z");

function occurrence(id: string, extra: Partial<PublicOccurrence> = {}): PublicOccurrence {
  return {
    id,
    type: "lost",
    species: "dog",
    petName: id,
    breed: null,
    color: null,
    description: null,
    photoUrls: [],
    publicLocation: { lat: -23.55, lng: -46.63 },
    approxAddress: null,
    authorPseudonym: "Tutor Laranja 42",
    status: "open",
    isMine: false,
    createdAt: "2026-11-20T10:00:00Z",
    ...extra,
  };
}

type Reply = PublicOccurrence[] | Error | Promise<PublicOccurrence[]>;

function setup({ replies = [] as Reply[], snapshot = null as MapSnapshot | null } = {}) {
  const queries: AreaQuery[] = [];
  const saved: MapSnapshot[] = [];
  const states: MapDataState[] = [];
  const client = {
    inArea: jest.fn(async (query: AreaQuery) => {
      queries.push(query);
      const reply = replies.shift() ?? [];
      if (reply instanceof Error) throw reply;
      return reply;
    }),
  };
  const cache: MapCache = {
    load: async () => snapshot,
    save: async (s) => void saved.push(s),
    clear: async () => {},
  };
  const loader = createMapLoader({ client, cache, now: () => now, onChange: (s) => states.push(s) });
  const last = () => states[states.length - 1];
  return { loader, client, queries, saved, states, last };
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("createMapLoader (MP-02)", () => {
  it("espera 400 ms sem movimento antes de buscar e usa só a última região", async () => {
    const { loader, client, queries } = setup();
    loader.regionChanged(sp);
    await jest.advanceTimersByTimeAsync(200);
    loader.regionChanged({ ...sp, longitude: -46.7 });
    await jest.advanceTimersByTimeAsync(399);
    expect(client.inArea).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(client.inArea).toHaveBeenCalledTimes(1);
    // bbox com folga em volta da última região
    expect(queries[0].bbox.minLng).toBeLessThan(-46.71);
    expect(queries[0].bbox.maxLng).toBeGreaterThan(-46.69);
    expect(queries[0].sinceDays).toBe(30);
  });

  it("loadNow busca na hora; um movimento pequeno depois não busca de novo, um grande sim", async () => {
    const { loader, client } = setup();
    await loader.loadNow(sp);
    expect(client.inArea).toHaveBeenCalledTimes(1);
    loader.regionChanged({ ...sp, latitude: sp.latitude + 0.001 });
    await jest.advanceTimersByTimeAsync(400);
    expect(client.inArea).toHaveBeenCalledTimes(1);
    loader.regionChanged({ ...sp, latitude: sp.latitude + 0.05 });
    await jest.advanceTimersByTimeAsync(400);
    expect(client.inArea).toHaveBeenCalledTimes(2);
  });

  it("mostra as ocorrências e guarda o mapa no cache (MP-08)", async () => {
    const thor = occurrence("thor");
    const { loader, saved, last, states } = setup({ replies: [[thor]] });
    await loader.loadNow(sp);
    expect(states[0]).toMatchObject({ loading: true });
    expect(last()).toEqual({ occurrences: [thor], loading: false, offline: false });
    expect(saved).toEqual([{ region: sp, occurrences: [thor], savedAt: now.toISOString() }]);
  });

  it("trocar os filtros (MP-05) busca de novo na hora, na mesma região, com os filtros", async () => {
    const { loader, client, queries } = setup();
    await loader.loadNow(sp);
    await loader.setFilters({ type: "seen", species: "cat", sinceDays: 7 });
    expect(client.inArea).toHaveBeenCalledTimes(2);
    expect(queries[1]).toMatchObject({ type: "seen", species: "cat", sinceDays: 7 });
    expect(queries[1].bbox).toEqual(queries[0].bbox);
  });

  it("filtros iguais aos atuais não buscam de novo", async () => {
    const { loader, client } = setup();
    await loader.loadNow(sp);
    await loader.setFilters({ ...DEFAULT_MAP_FILTERS });
    expect(client.inArea).toHaveBeenCalledTimes(1);
  });

  it("sem internet, mostra o último mapa salvo com os filtros atuais aplicados (MP-08)", async () => {
    const dog = occurrence("dog");
    const cat = occurrence("cat", { species: "cat" });
    const snapshot = { region: { ...sp, latitude: -22.9 }, occurrences: [dog, cat], savedAt: "2026-11-19T10:00:00Z" };
    const { loader, last } = setup({ replies: [new ApiError("sem rede", 0), new ApiError("sem rede", 0)], snapshot });
    await loader.loadNow(sp);
    expect(last()).toEqual({ occurrences: [dog, cat], loading: false, offline: true, offlineRegion: snapshot.region });
    await loader.setFilters({ ...DEFAULT_MAP_FILTERS, species: "cat" });
    expect(last()).toMatchObject({ occurrences: [cat], offline: true });
  });

  it("offline, buscar de novo ou outro erro não perde a região do mapa salvo", async () => {
    const snapshot = { region: { ...sp, latitude: -22.9 }, occurrences: [], savedAt: "x" };
    const { loader, states } = setup({ replies: [new ApiError("sem rede", 0), new ApiError("Erro no servidor", 500)], snapshot });
    await loader.loadNow(sp);
    await loader.refresh();
    const offline = states.filter((s) => s.offline);
    expect(offline.length).toBeGreaterThan(1);
    for (const s of offline) expect(s.offlineRegion).toEqual(snapshot.region);
  });

  it("sem internet e sem cache, avisa", async () => {
    const { loader, last } = setup({ replies: [new ApiError("sem rede", 0)] });
    await loader.loadNow(sp);
    expect(last()).toEqual({ occurrences: [], loading: false, offline: false, error: OFFLINE_MESSAGE });
  });

  it("depois de cair para o cache, qualquer movimento tenta a API de novo", async () => {
    const thor = occurrence("thor");
    const snapshot = { region: sp, occurrences: [], savedAt: "x" };
    const { loader, client, last } = setup({ replies: [new ApiError("sem rede", 0), [thor]], snapshot });
    await loader.loadNow(sp);
    loader.regionChanged({ ...sp, latitude: sp.latitude + 0.001 });
    await jest.advanceTimersByTimeAsync(400);
    expect(client.inArea).toHaveBeenCalledTimes(2);
    expect(last()).toEqual({ occurrences: [thor], loading: false, offline: false });
  });

  it("outro erro da API mostra a mensagem e mantém o que já estava no mapa", async () => {
    const thor = occurrence("thor");
    const { loader, last } = setup({ replies: [[thor], new ApiError("Erro no servidor", 500)] });
    await loader.loadNow(sp);
    await loader.refresh();
    expect(last()).toEqual({ occurrences: [thor], loading: false, offline: false, error: "Erro no servidor" });
  });

  it("uma resposta antiga não sobrescreve uma mais nova", async () => {
    let resolveOld: (v: PublicOccurrence[]) => void = () => {};
    const old = new Promise<PublicOccurrence[]>((r) => (resolveOld = r));
    const fresh = occurrence("nova");
    const { loader, last } = setup({ replies: [old, [fresh]] });
    const first = loader.loadNow(sp);
    await loader.loadNow({ ...sp, latitude: -22 });
    resolveOld([occurrence("velha")]);
    await first;
    expect(last().occurrences).toEqual([fresh]);
  });

  it("dispose cancela a busca agendada", async () => {
    const { loader, client } = setup();
    loader.regionChanged(sp);
    loader.dispose();
    await jest.advanceTimersByTimeAsync(1000);
    expect(client.inArea).not.toHaveBeenCalled();
  });
});
