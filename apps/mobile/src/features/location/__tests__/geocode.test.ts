import { createGeocoder, type GeocodeApi } from "../geocode";

function api(overrides: Partial<GeocodeApi> = {}): GeocodeApi & { geocodeAsync: jest.Mock; requestForegroundPermissionsAsync: jest.Mock } {
  return {
    requestForegroundPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
    geocodeAsync: jest.fn(async () => [{ latitude: -23.5617, longitude: -46.6559 }]),
    ...overrides,
  } as never;
}

describe("createGeocoder", () => {
  it("pede a permissão (exigida no Android) e devolve o primeiro ponto encontrado", async () => {
    const fake = api();
    expect(await createGeocoder(fake)("Av. Paulista, 1578")).toEqual({ lat: -23.5617, lng: -46.6559 });
    expect(fake.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(fake.geocodeAsync).toHaveBeenCalledWith("Av. Paulista, 1578");
  });

  it("sem resultado, com erro do geocodificador ou sem permissão → null (nunca lança)", async () => {
    expect(await createGeocoder(api({ geocodeAsync: async () => [] }))("x")).toBeNull();
    expect(
      await createGeocoder(
        api({
          geocodeAsync: async () => {
            throw new Error("rate limit");
          },
        }),
      )("x"),
    ).toBeNull();
    const denied = api({ requestForegroundPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    expect(await createGeocoder(denied)("x")).toBeNull();
    expect(denied.geocodeAsync).not.toHaveBeenCalled();
  });
});
