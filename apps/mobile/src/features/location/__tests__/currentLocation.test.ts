import { createLocationProvider, type LocationApi } from "../currentLocation";

const position = (latitude: number, longitude: number) => ({ coords: { latitude, longitude } });

function api(overrides: Partial<LocationApi> = {}): LocationApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    requestForegroundPermissionsAsync: async () => {
      calls.push("permission");
      return { granted: true, canAskAgain: true };
    },
    getCurrentPositionAsync: async (options) => {
      calls.push(`current:${options.accuracy}`);
      return position(-23.56, -46.65);
    },
    getLastKnownPositionAsync: async () => {
      calls.push("lastKnown");
      return null;
    },
    ...overrides,
  };
}

describe("createLocationProvider", () => {
  it("pede só a permissão de primeiro plano e devolve a posição atual", async () => {
    const fake = api();
    expect(await createLocationProvider(fake)()).toEqual({ status: "ok", coords: { lat: -23.56, lng: -46.65 } });
    expect(fake.calls).toEqual(["permission", "current:3"]); // 3 = Accuracy.Balanced
  });

  it("permissão negada → denied, dizendo se ainda dá para pedir de novo, sem buscar a posição", async () => {
    const fake = api({ requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    expect(await createLocationProvider(fake)()).toEqual({ status: "denied", canAskAgain: false });
    expect(fake.calls).toEqual([]);
  });

  it("erro ao pedir permissão também vira denied (nunca quebra a tela)", async () => {
    const fake = api({
      requestForegroundPermissionsAsync: async () => {
        throw new Error("sem módulo nativo");
      },
    });
    expect(await createLocationProvider(fake)()).toEqual({ status: "denied", canAskAgain: true });
  });

  it("GPS falhou → usa a última posição conhecida", async () => {
    const fake = api({
      getCurrentPositionAsync: async () => {
        throw new Error("Location services are disabled");
      },
      getLastKnownPositionAsync: async () => position(1, 2),
    });
    expect(await createLocationProvider(fake)()).toEqual({ status: "ok", coords: { lat: 1, lng: 2 } });
  });

  it("GPS demorou demais → usa a última posição conhecida", async () => {
    jest.useFakeTimers();
    try {
      const fake = api({
        getCurrentPositionAsync: () => new Promise(() => {}),
        getLastKnownPositionAsync: async () => position(3, 4),
      });
      const result = createLocationProvider(fake, { timeoutMs: 5000 })();
      await jest.advanceTimersByTimeAsync(5000);
      expect(await result).toEqual({ status: "ok", coords: { lat: 3, lng: 4 } });
    } finally {
      jest.useRealTimers();
    }
  });

  it("sem posição atual nem conhecida → unavailable", async () => {
    const fake = api({
      getCurrentPositionAsync: async () => {
        throw new Error("x");
      },
      getLastKnownPositionAsync: async () => {
        throw new Error("y");
      },
    });
    expect(await createLocationProvider(fake)()).toEqual({ status: "unavailable" });
  });
});

describe("createLocationProvider({ ask: false }) (atualização da região para os alertas)", () => {
  it("não pede permissão: só confere se já foi dada", async () => {
    const fake = api({
      requestForegroundPermissionsAsync: async () => {
        throw new Error("não devia pedir");
      },
    });
    const check = jest.fn(async () => ({ granted: true, canAskAgain: true }));
    const provider = createLocationProvider({ ...fake, getForegroundPermissionsAsync: check }, { ask: false });
    expect(await provider()).toEqual({ status: "ok", coords: { lat: -23.56, lng: -46.65 } });
    expect(check).toHaveBeenCalled();
  });

  it("sem permissão ainda → denied, sem abrir o diálogo do sistema", async () => {
    const fake = api();
    const provider = createLocationProvider(
      { ...fake, getForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) },
      { ask: false },
    );
    expect(await provider()).toEqual({ status: "denied", canAskAgain: true });
    expect(fake.calls).toEqual([]);
  });
});
