import { geofencingAvailability, geofenceNotification, nearbyGeofenceCandidates, planGeofences } from "../geofencing";

describe("geofencingAvailability (AL-02, desligado por padrão)", () => {
  it("só liga num development build com a flag EXPO_PUBLIC_GEOFENCING=1", () => {
    expect(geofencingAvailability({ os: "android", isExpoGo: false, flag: "1" })).toBe("enabled");
    expect(geofencingAvailability({ os: "ios", isExpoGo: false, flag: "1" })).toBe("enabled");
  });

  it("no Expo Go nunca liga (nem pede a permissão 'sempre')", () => {
    expect(geofencingAvailability({ os: "android", isExpoGo: true, flag: "1" })).toBe("expo-go");
  });

  it("sem a flag fica desligado; na web não existe", () => {
    expect(geofencingAvailability({ os: "android", isExpoGo: false, flag: undefined })).toBe("flag-off");
    expect(geofencingAvailability({ os: "android", isExpoGo: false, flag: "0" })).toBe("flag-off");
    expect(geofencingAvailability({ os: "web", isExpoGo: false, flag: "1" })).toBe("unsupported");
  });
});

describe("planGeofences (AL-03)", () => {
  const here = { lat: -23.55, lng: -46.63 };
  const occ = (id: string, northKm: number) => ({ id, publicLocation: { lat: here.lat + northKm / 111.195, lng: here.lng } });
  const list = Array.from({ length: 30 }, (_, i) => occ(`o${i}`, i * 0.2));

  it("na primeira vez monitora as mais próximas, deixando uma vaga para a região de recálculo", () => {
    const plan = planGeofences({ occurrences: list, here, lastCenter: null, os: "ios" });
    expect(plan.recalculate).toBe(true);
    if (!plan.recalculate) return;
    expect(plan.regions).toHaveLength(20);
    expect(plan.regions[0]).toEqual({ identifier: "recalc", latitude: here.lat, longitude: here.lng, radius: 1000, notifyOnEnter: false, notifyOnExit: true });
    expect(plan.regions.slice(1).map((r) => r.identifier)).toEqual(list.slice(0, 19).map((o) => o.id));
    expect(plan.regions[1]).toMatchObject({ notifyOnEnter: true, notifyOnExit: false, radius: 300 });
  });

  it("sem se deslocar mais de 1 km, não recalcula", () => {
    expect(planGeofences({ occurrences: list, here, lastCenter: { lat: here.lat + 0.003, lng: here.lng }, os: "android" })).toEqual({ recalculate: false });
  });

  it("no Android cabem 100 (99 + recálculo)", () => {
    const many = Array.from({ length: 150 }, (_, i) => occ(`o${i}`, i * 0.05));
    const plan = planGeofences({ occurrences: many, here, lastCenter: null, os: "android" });
    expect(plan.recalculate && plan.regions).toHaveLength(100);
  });
});

describe("geofenceNotification", () => {
  it("monta a notificação local que abre o detalhe (AL-08) e evita repetir (AL-05)", () => {
    expect(geofenceNotification("o1", [])).toEqual({
      title: "Você está perto de um pet perdido",
      body: "Toque para ver a ocorrência e ajudar.",
      data: { occurrenceId: "o1" },
    });
    expect(geofenceNotification("o1", ["o1"])).toBeNull();
    expect(geofenceNotification("recalc", [])).toBeNull();
  });
});

describe("nearbyGeofenceCandidates (AL-02)", () => {
  const here = { lat: -23.55, lng: -46.63 };
  const at = { lat: -23.551, lng: -46.631 };
  const occ = (id: string, type: "lost" | "seen" | "found", isMine = false) => ({ id, type, isMine, publicLocation: at });
  const prefs = { enabled: true, radiusKm: 3 as const, quietHours: null };

  it("só pets perdidos de outras pessoas, no raio escolhido nas preferências", async () => {
    const nearby = jest.fn(async () => [occ("a", "lost"), occ("b", "seen"), occ("c", "found"), occ("meu", "lost", true)]);
    const list = await nearbyGeofenceCandidates({ here, nearby, getPreferences: async () => prefs });
    expect(list.map((o) => o.id)).toEqual(["a"]);
    expect(nearby).toHaveBeenCalledWith({ ...here, radiusKm: 3 });
  });

  it("alertas desligados → nenhuma região (nem consulta as ocorrências)", async () => {
    const nearby = jest.fn(async () => [occ("a", "lost")]);
    const list = await nearbyGeofenceCandidates({ here, nearby, getPreferences: async () => ({ ...prefs, enabled: false }) });
    expect(list).toEqual([]);
    expect(nearby).not.toHaveBeenCalled();
  });
});
