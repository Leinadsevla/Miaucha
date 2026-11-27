import { buildAlertPush, buildSightingPush, parseLocationBody, parsePreferencesBody } from "./alert-params";

describe("parseLocationBody (AL-06: só geohash de precisão 6)", () => {
  it("aceita exatamente { geohash } com 6 caracteres", () => {
    expect(parseLocationBody({ geohash: "6gyf4b" })).toEqual({ geohash: "6gyf4b" });
  });

  it.each([
    [{ geohash: "6gyf4" }],
    [{ geohash: "6gyf4bc" }],
    [{ geohash: "6GYF4B" }],
    [{ geohash: "6gyf4a" }],
    [{ geohash: 123456 }],
    [{}],
    [undefined],
    [{ lat: -23.55, lng: -46.63 }],
    [{ geohash: "6gyf4b", lat: -23.55, lng: -46.63 }],
    [{ geohash: "6gyf4b", accuracy: 5 }],
  ])("recusa %o", (body) => {
    expect(parseLocationBody(body)).toEqual({ error: expect.any(String) });
  });
});

describe("parsePreferencesBody (AL-04)", () => {
  it("aceita preferências válidas", () => {
    expect(parsePreferencesBody({ enabled: false, radiusKm: 5, quietHours: { start: "22:00", end: "07:00" } })).toEqual({
      prefs: { enabled: false, radiusKm: 5, quietHours: { start: "22:00", end: "07:00" } },
    });
    expect(parsePreferencesBody({ enabled: true, radiusKm: 1, quietHours: null })).toEqual({
      prefs: { enabled: true, radiusKm: 1, quietHours: null },
    });
  });

  it("sem quietHours = sem silêncio", () => {
    expect(parsePreferencesBody({ enabled: true, radiusKm: 3 })).toEqual({ prefs: { enabled: true, radiusKm: 3, quietHours: null } });
  });

  it("devolve os erros por campo", () => {
    expect(parsePreferencesBody({ enabled: "sim", radiusKm: "3", quietHours: { start: "25:00", end: "07:00" } })).toEqual({
      errors: {
        enabled: "Informe se os alertas estão ligados",
        radiusKm: "Escolha um raio de 1, 3 ou 5 km",
        quietStart: "Use o formato HH:MM (ex.: 22:00)",
      },
    });
    expect(parsePreferencesBody({ enabled: true, radiusKm: 3, quietHours: "22-07" })).toEqual({
      errors: { quietStart: "Use o formato HH:MM (ex.: 22:00)", quietEnd: "Use o formato HH:MM (ex.: 22:00)" },
    });
  });
});

describe("buildAlertPush", () => {
  it("outras espécies também aparecem pelo nome", () => {
    const rabbit = { occurrenceId: "o", alertId: "a", type: "seen" as const, species: "rabbit" as const, petName: null, approxAddress: null, distanceMeters: 300 };
    expect(buildAlertPush(rabbit, "t").body).toBe("Coelho sem nome · a 300 m");
    expect(buildAlertPush({ ...rabbit, species: "other", petName: "Bob" }, "t").body).toBe("Bob (outro animal) · a 300 m");
  });

  const base = { occurrenceId: "o1", alertId: "a1", species: "dog" as const, petName: "Thor", approxAddress: "Perto da praça", distanceMeters: 820 };

  it("título pelo tipo; corpo com nome, distância aproximada e endereço aproximado", () => {
    expect(buildAlertPush({ ...base, type: "lost" }, "ExponentPushToken[x]")).toEqual({
      to: "ExponentPushToken[x]",
      title: "Pet perdido perto de você",
      body: "Thor (cão) · a 800 m · Perto da praça",
      data: { occurrenceId: "o1", alertId: "a1" },
    });
    expect(buildAlertPush({ ...base, type: "seen", petName: null, species: "cat", approxAddress: null }, "t").title).toBe(
      "Pet avistado perto de você",
    );
    expect(buildAlertPush({ ...base, type: "seen", petName: null, species: "cat", approxAddress: null }, "t").body).toBe(
      "Gato sem nome · a 800 m",
    );
    expect(buildAlertPush({ ...base, type: "found", distanceMeters: 2_340 }, "t").title).toBe("Pet encontrado perto de você");
    expect(buildAlertPush({ ...base, type: "found", distanceMeters: 2_340 }, "t").body).toContain("a 2,3 km");
  });
});

describe("buildSightingPush (\"Vi este pet\")", () => {
  const base = { occurrenceId: "s1", alertId: "a1", petName: "Thor", species: "dog" as const, approxAddress: "Perto do metrô", distanceMeters: 2_300 };

  it("título com o nome do pet; corpo com a distância de onde sumiu e o endereço; abre o avistamento", () => {
    expect(buildSightingPush(base, "ExponentPushToken[x]")).toEqual({
      to: "ExponentPushToken[x]",
      title: "Alguém viu o Thor!",
      body: "Avistado a ~2,3 km de onde sumiu · Perto do metrô",
      data: { occurrenceId: "s1", alertId: "a1" },
    });
  });

  it("sem nome nem endereço", () => {
    const push = buildSightingPush({ ...base, petName: null, species: "cat", approxAddress: null, distanceMeters: 300 }, "t");
    expect(push.title).toBe("Alguém viu o seu gato!");
    expect(push.body).toBe("Avistado a ~300 m de onde sumiu");
  });
});
