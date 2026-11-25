import {
  ALERT_GEOHASH_PRECISION,
  decodeGeohash,
  encodeGeohash,
  geohashNeighbors,
  isValidGeohash,
} from "../geohash";

describe("encodeGeohash", () => {
  it.each([
    // Valores de referência (Wikipedia e geohash.org).
    [42.6, -5.6, 5, "ezs42"],
    [57.64911, 10.40744, 11, "u4pruydqqvj"],
    [0, 0, 6, "s00000"],
    [-90, -180, 6, "000000"],
    // Praça da Sé, São Paulo.
    [-23.5505, -46.6333, 6, "6gyf4b"],
  ])("(%f, %f) com precisão %i → %s", (lat, lng, precision, expected) => {
    expect(encodeGeohash(lat, lng, precision)).toBe(expected);
  });

  it("a precisão padrão dos alertas é 6 (célula de ~1,2 km × 0,6 km, AL-06)", () => {
    expect(ALERT_GEOHASH_PRECISION).toBe(6);
    expect(encodeGeohash(-23.5505, -46.6333)).toHaveLength(6);
  });

  it("pontos a poucos metros caem na mesma célula; a 2 km, não", () => {
    expect(encodeGeohash(-23.55, -46.6335)).toBe(encodeGeohash(-23.5501, -46.6334));
    expect(encodeGeohash(-23.55, -46.6335)).not.toBe(encodeGeohash(-23.568, -46.6335));
  });

  it("recusa coordenada inválida e precisão fora de 1 a 12", () => {
    expect(() => encodeGeohash(91, 0)).toThrow();
    expect(() => encodeGeohash(0, Number.NaN)).toThrow();
    expect(() => encodeGeohash(0, 0, 0)).toThrow();
    expect(() => encodeGeohash(0, 0, 13)).toThrow();
  });
});

describe("decodeGeohash", () => {
  it("devolve a caixa da célula e o centro, que contém o ponto original", () => {
    const cell = decodeGeohash("6gyf4b");
    expect(cell.minLat).toBeLessThanOrEqual(-23.5505);
    expect(cell.maxLat).toBeGreaterThanOrEqual(-23.5505);
    expect(cell.minLng).toBeLessThanOrEqual(-46.6333);
    expect(cell.maxLng).toBeGreaterThanOrEqual(-46.6333);
    expect(cell.center.lat).toBeCloseTo((cell.minLat + cell.maxLat) / 2, 10);
    expect(cell.center.lng).toBeCloseTo((cell.minLng + cell.maxLng) / 2, 10);
  });

  it("uma célula de precisão 6 mede ~1,2 km × 0,6 km", () => {
    const cell = decodeGeohash("6gyf4b");
    expect((cell.maxLng - cell.minLng) * 111_320 * Math.cos((cell.center.lat * Math.PI) / 180)).toBeLessThan(1_250);
    expect((cell.maxLat - cell.minLat) * 111_195).toBeLessThan(620);
  });

  it("encode(centro) volta para a mesma célula", () => {
    for (const hash of ["ezs42", "6gyf4b", "u4pruydqqvj", "s00000"]) {
      const { center } = decodeGeohash(hash);
      expect(encodeGeohash(center.lat, center.lng, hash.length)).toBe(hash);
    }
  });

  it("recusa geohash inválido", () => {
    expect(() => decodeGeohash("abc")).toThrow(); // "a" não existe no alfabeto
    expect(() => decodeGeohash("")).toThrow();
  });
});

describe("geohashNeighbors", () => {
  it("devolve as 8 vizinhas de ezs42 (valores de referência)", () => {
    expect(geohashNeighbors("ezs42")).toEqual({
      n: "ezs48",
      ne: "ezs49",
      e: "ezs43",
      se: "ezs41",
      s: "ezs40",
      sw: "ezefp",
      w: "ezefr",
      nw: "ezefx",
    });
  });

  it("atravessa a linha de data", () => {
    const west = encodeGeohash(0.1, -179.99, 4);
    const east = encodeGeohash(0.1, 179.99, 4);
    expect(geohashNeighbors(west).w).toBe(east);
    expect(geohashNeighbors(east).e).toBe(west);
  });

  it("no polo não há vizinha ao norte (devolve null)", () => {
    const top = encodeGeohash(89.99, 0, 3);
    expect(geohashNeighbors(top).n).toBeNull();
    expect(geohashNeighbors(top).ne).toBeNull();
    expect(geohashNeighbors(top).s).not.toBeNull();
  });
});

describe("isValidGeohash", () => {
  it("aceita só o alfabeto base32 do geohash e o tamanho pedido", () => {
    expect(isValidGeohash("6gyf4b", 6)).toBe(true);
    expect(isValidGeohash("6GYF4B", 6)).toBe(false);
    expect(isValidGeohash("6gyf4a", 6)).toBe(false);
    expect(isValidGeohash("6gyf4", 6)).toBe(false);
    expect(isValidGeohash("6gyf4bb", 6)).toBe(false);
    expect(isValidGeohash(123456, 6)).toBe(false);
    expect(isValidGeohash("ezs42")).toBe(true);
  });
});
