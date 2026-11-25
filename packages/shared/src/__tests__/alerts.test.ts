import {
  ALERT_RADII_KM,
  DEFAULT_ALERT_PREFERENCES,
  GEOFENCE_LIMITS,
  isInQuietHours,
  isValidPushToken,
  minutesToTime,
  parseTime,
  pickGeofenceRegions,
  shouldRecalculateGeofences,
  validateAlertPreferences,
  type AlertPreferences,
} from "../alerts";

describe("preferências de alerta (AL-04)", () => {
  it("raios permitidos: 1, 3 e 5 km; padrão ligado, 3 km, sem silêncio", () => {
    expect(ALERT_RADII_KM).toEqual([1, 3, 5]);
    expect(DEFAULT_ALERT_PREFERENCES).toEqual({ enabled: true, radiusKm: 3, quietHours: null });
  });

  it("aceita preferências válidas, inclusive silêncio que atravessa a meia-noite", () => {
    expect(validateAlertPreferences({ enabled: true, radiusKm: 1, quietHours: null })).toEqual({});
    expect(validateAlertPreferences({ enabled: false, radiusKm: 5, quietHours: { start: "22:00", end: "07:00" } })).toEqual({});
  });

  it("recusa raio fora da lista, enabled que não é booleano e horário mal formatado", () => {
    expect(validateAlertPreferences({ enabled: true, radiusKm: 2, quietHours: null } as unknown as AlertPreferences)).toEqual({
      radiusKm: "Escolha um raio de 1, 3 ou 5 km",
    });
    expect(validateAlertPreferences({ enabled: "sim", radiusKm: 3, quietHours: null } as unknown as AlertPreferences)).toEqual({
      enabled: "Informe se os alertas estão ligados",
    });
    expect(validateAlertPreferences({ enabled: true, radiusKm: 3, quietHours: { start: "24:00", end: "7:00" } })).toEqual({
      quietStart: "Use o formato HH:MM (ex.: 22:00)",
      quietEnd: "Use o formato HH:MM (ex.: 22:00)",
    });
  });

  it("início e fim iguais não é um silêncio válido", () => {
    expect(validateAlertPreferences({ enabled: true, radiusKm: 3, quietHours: { start: "22:00", end: "22:00" } })).toEqual({
      quietEnd: "O fim precisa ser diferente do início",
    });
  });
});

describe("parseTime / minutesToTime", () => {
  it("converte HH:MM em minutos desde a meia-noite e volta", () => {
    expect(parseTime("00:00")).toBe(0);
    expect(parseTime("07:30")).toBe(450);
    expect(parseTime("23:59")).toBe(1439);
    expect(minutesToTime(450)).toBe("07:30");
    expect(minutesToTime(0)).toBe("00:00");
  });

  it.each(["24:00", "7:30", "12:60", "", "ab:cd", "12:3"])("%p é inválido → null", (value) => {
    expect(parseTime(value)).toBeNull();
  });
});

describe("isInQuietHours (fuso de São Paulo)", () => {
  const night = { start: "22:00", end: "07:00" };
  // São Paulo é UTC-3 (sem horário de verão desde 2019): 22:00 local = 01:00 UTC do dia seguinte.
  it.each([
    ["2026-11-21T01:00:00Z", true], // 22:00
    ["2026-11-21T05:30:00Z", true], // 02:30
    ["2026-11-21T09:59:00Z", true], // 06:59
    ["2026-11-21T10:00:00Z", false], // 07:00 (fim não incluso)
    ["2026-11-20T15:00:00Z", false], // 12:00
    ["2026-11-21T00:59:00Z", false], // 21:59
  ])("silêncio 22:00–07:00 às %s → %p", (iso, expected) => {
    expect(isInQuietHours(night, new Date(iso))).toBe(expected);
  });

  it("silêncio no mesmo dia (13:00–15:00)", () => {
    const lunch = { start: "13:00", end: "15:00" };
    expect(isInQuietHours(lunch, new Date("2026-11-20T16:30:00Z"))).toBe(true); // 13:30
    expect(isInQuietHours(lunch, new Date("2026-11-20T18:00:00Z"))).toBe(false); // 15:00
    expect(isInQuietHours(lunch, new Date("2026-11-20T15:59:00Z"))).toBe(false); // 12:59
  });

  it("sem silêncio configurado, nunca está no silêncio", () => {
    expect(isInQuietHours(null, new Date())).toBe(false);
  });

  it("aceita outro fuso", () => {
    expect(isInQuietHours(night, new Date("2026-11-20T23:00:00Z"), "UTC")).toBe(true);
    expect(isInQuietHours(night, new Date("2026-11-20T23:00:00Z"))).toBe(false); // 20:00 em SP
  });
});

describe("isValidPushToken", () => {
  it("aceita só o formato do Expo Push", () => {
    expect(isValidPushToken("ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]")).toBe(true);
    expect(isValidPushToken("ExpoPushToken[abc-123_DEF]")).toBe(true);
    expect(isValidPushToken("ExponentPushToken[]")).toBe(false);
    expect(isValidPushToken("fcm-token-qualquer")).toBe(false);
    expect(isValidPushToken("ExponentPushToken[abc] extra")).toBe(false);
    expect(isValidPushToken(`ExponentPushToken[${"a".repeat(300)}]`)).toBe(false);
    expect(isValidPushToken(42)).toBe(false);
  });
});

describe("geofencing: escolher as regiões monitoradas (AL-03)", () => {
  const here = { lat: -23.55, lng: -46.63 };
  const at = (northKm: number) => ({ lat: here.lat + northKm / 111.195, lng: here.lng });
  const occurrences = Array.from({ length: 150 }, (_, i) => ({ id: `o${i}`, publicLocation: at((150 - i) * 0.1) }));

  it("limites do sistema: iOS 20 regiões, Android 100", () => {
    expect(GEOFENCE_LIMITS).toEqual({ ios: 20, android: 100 });
  });

  it("pega as N mais próximas, da mais perto para a mais longe", () => {
    const ios = pickGeofenceRegions(occurrences, here, "ios");
    expect(ios).toHaveLength(20);
    expect(ios[0].id).toBe("o149");
    expect(ios[19].id).toBe("o130");
    expect(pickGeofenceRegions(occurrences, here, "android")).toHaveLength(100);
  });

  it("cada região tem o raio pedido e o centro no ponto público", () => {
    const [first] = pickGeofenceRegions(occurrences.slice(0, 1), here, "ios", { radiusMeters: 300 });
    expect(first).toEqual({ id: "o0", latitude: occurrences[0].publicLocation.lat, longitude: occurrences[0].publicLocation.lng, radius: 300 });
  });

  it("deixa uma vaga livre quando pedido (região de recálculo)", () => {
    expect(pickGeofenceRegions(occurrences, here, "ios", { reserve: 1 })).toHaveLength(19);
  });

  it("recalcula só ao se deslocar mais que o limite (ou na primeira vez)", () => {
    expect(shouldRecalculateGeofences(null, here)).toBe(true);
    expect(shouldRecalculateGeofences(here, at(0.5))).toBe(false);
    expect(shouldRecalculateGeofences(here, at(1.2))).toBe(true);
    expect(shouldRecalculateGeofences(here, at(0.3), 200)).toBe(true);
  });
});
