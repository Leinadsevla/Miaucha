import { PUBLIC_OFFSET_MAX_METERS, PUBLIC_OFFSET_MIN_METERS, distanceMeters, isValidLatLng, publicPoint } from "../geo";

describe("distanceMeters (haversine)", () => {
  it("mesmo ponto → 0", () => {
    expect(distanceMeters({ lat: -23.56, lng: -46.65 }, { lat: -23.56, lng: -46.65 })).toBe(0);
  });

  it("1 grau de latitude ≈ 111,2 km", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });

  it("Av. Paulista (MASP) → Praça da Sé ≈ 3 km", () => {
    const masp = { lat: -23.5614, lng: -46.6559 };
    const se = { lat: -23.5503, lng: -46.6339 };
    const d = distanceMeters(masp, se);
    expect(d).toBeGreaterThan(2400);
    expect(d).toBeLessThan(2700);
  });
});

describe("publicPoint (MP-07)", () => {
  const real = { lat: -23.561414, lng: -46.655881 };

  it("fica sempre entre 50 e 200 m do ponto real, em muitos sorteios", () => {
    for (let i = 0; i < 2000; i++) {
      const d = distanceMeters(real, publicPoint(real.lat, real.lng));
      expect(d).toBeGreaterThanOrEqual(50);
      expect(d).toBeLessThanOrEqual(200);
    }
  });

  it("os limites usados ficam dentro da faixa de 50–200 m (com folga para a diferença esfera × elipsoide do PostGIS)", () => {
    expect(PUBLIC_OFFSET_MIN_METERS).toBeGreaterThan(50);
    expect(PUBLIC_OFFSET_MAX_METERS).toBeLessThan(200);
  });

  it("os extremos do sorteio dão exatamente a distância mínima e a máxima", () => {
    expect(distanceMeters(real, publicPoint(real.lat, real.lng, () => 0))).toBeCloseTo(PUBLIC_OFFSET_MIN_METERS, 3);
    const nearlyOne = () => 0.999999999;
    expect(distanceMeters(real, publicPoint(real.lat, real.lng, nearlyOne))).toBeCloseTo(PUBLIC_OFFSET_MAX_METERS, 2);
  });

  it("com `random` injetado o resultado é determinístico", () => {
    const seq = () => {
      const values = [0.25, 0.5];
      return () => values.shift()!;
    };
    expect(publicPoint(real.lat, real.lng, seq())).toEqual(publicPoint(real.lat, real.lng, seq()));
  });

  it("a direção varia (não desloca sempre para o mesmo lado)", () => {
    const points = Array.from({ length: 50 }, () => publicPoint(real.lat, real.lng));
    expect(points.some((p) => p.lat > real.lat)).toBe(true);
    expect(points.some((p) => p.lat < real.lat)).toBe(true);
    expect(points.some((p) => p.lng > real.lng)).toBe(true);
    expect(points.some((p) => p.lng < real.lng)).toBe(true);
  });

  it("funciona perto da linha de data (longitude continua entre -180 e 180)", () => {
    for (let i = 0; i < 100; i++) {
      const p = publicPoint(0, 179.9999);
      expect(p.lng).toBeGreaterThanOrEqual(-180);
      expect(p.lng).toBeLessThanOrEqual(180);
    }
  });
});

describe("isValidLatLng", () => {
  it.each([
    [-23.56, -46.65, true],
    [90, 180, true],
    [-90, -180, true],
    [91, 0, false],
    [0, -181, false],
    [Number.NaN, 0, false],
    [0, Number.POSITIVE_INFINITY, false],
  ])("(%d, %d) → %s", (lat, lng, expected) => {
    expect(isValidLatLng(lat, lng)).toBe(expected);
  });

  it("recusa o que não é número", () => {
    expect(isValidLatLng("1" as never, 2)).toBe(false);
  });
});
