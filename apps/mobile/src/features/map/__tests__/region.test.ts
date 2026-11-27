import {
  DEFAULT_REGION,
  bboxContains,
  bboxParam,
  boundsToRegion,
  regionAround,
  regionToBBox,
  regionToBounds,
  regionToZoom,
  shouldRefetch,
  zoomInto,
  type Region,
} from "../region";

const sp: Region = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.02, longitudeDelta: 0.04 };

describe("regionToBBox (MP-02)", () => {
  it("devolve a área visível a partir do centro e dos deltas", () => {
    const b = regionToBBox(sp);
    expect(b.minLat).toBeCloseTo(-23.56);
    expect(b.maxLat).toBeCloseTo(-23.54);
    expect(b.minLng).toBeCloseTo(-46.65);
    expect(b.maxLng).toBeCloseTo(-46.61);
  });

  it("aumenta cada lado pela folga pedida", () => {
    const b = regionToBBox(sp, 0.5);
    expect(b.maxLat - b.minLat).toBeCloseTo(0.04);
    expect(b.maxLng - b.minLng).toBeCloseTo(0.08);
  });

  it("nunca passa dos limites de latitude e longitude (a API recusa)", () => {
    const b = regionToBBox({ latitude: 89, longitude: 179, latitudeDelta: 10, longitudeDelta: 10 });
    expect(b.maxLat).toBe(90);
    expect(b.maxLng).toBe(180);
    expect(b.minLat).toBeLessThan(b.maxLat);
    expect(b.minLng).toBeLessThan(b.maxLng);
  });
});

describe("bboxParam", () => {
  it("monta minLng,minLat,maxLng,maxLat com 5 casas", () => {
    expect(bboxParam({ minLng: -46.651234567, minLat: -23.56, maxLng: -46.61, maxLat: -23.5400001 })).toBe(
      "-46.65123,-23.56000,-46.61000,-23.54000",
    );
  });
});

describe("bboxContains", () => {
  it("é verdadeiro só quando a área de dentro cabe inteira na de fora", () => {
    const outer = regionToBBox(sp, 0.25);
    expect(bboxContains(outer, regionToBBox(sp))).toBe(true);
    expect(bboxContains(regionToBBox(sp), outer)).toBe(false);
  });
});

describe("shouldRefetch (MP-02: não refaz a busca se a região mudou pouco)", () => {
  const last = { region: sp, bbox: regionToBBox(sp, 0.25), complete: true };

  it("busca quando ainda não há resultado", () => {
    expect(shouldRefetch(null, sp)).toBe(true);
  });

  it("não busca de novo num deslocamento pequeno, dentro da folga já carregada", () => {
    expect(shouldRefetch(last, { ...sp, latitude: sp.latitude + 0.002, longitude: sp.longitude - 0.004 })).toBe(false);
  });

  it("busca quando a área visível sai da área carregada", () => {
    expect(shouldRefetch(last, { ...sp, longitude: sp.longitude + 0.03 })).toBe(true);
  });

  it("busca ao afastar o zoom (a área cresce)", () => {
    expect(shouldRefetch(last, { ...sp, latitudeDelta: 0.04, longitudeDelta: 0.08 })).toBe(true);
  });

  it("ao aproximar o zoom, só busca de novo se o último resultado veio cortado no limite da API", () => {
    const zoomedIn = { ...sp, latitudeDelta: 0.005, longitudeDelta: 0.01 };
    expect(shouldRefetch(last, zoomedIn)).toBe(false);
    expect(shouldRefetch({ ...last, complete: false }, zoomedIn)).toBe(true);
  });
});

describe("zoom", () => {
  it("regionToZoom: 360° de longitude numa tela de 256 px é zoom 0; metade do delta soma 1", () => {
    expect(regionToZoom({ ...sp, longitudeDelta: 360 }, 256)).toBeCloseTo(0);
    expect(regionToZoom({ ...sp, longitudeDelta: 180 }, 256)).toBeCloseTo(1);
    expect(regionToZoom({ ...sp, longitudeDelta: 0.04 }, 400)).toBeCloseTo(Math.log2((360 * 400) / 256 / 0.04));
  });

  it("zoomInto centraliza no ponto e ajusta os deltas para o zoom pedido, mantendo a proporção", () => {
    const zoom = regionToZoom(sp, 400);
    const next = zoomInto(sp, { lat: -23.5, lng: -46.6 }, zoom + 2, 400);
    expect(next.latitude).toBe(-23.5);
    expect(next.longitude).toBe(-46.6);
    expect(next.longitudeDelta).toBeCloseTo(sp.longitudeDelta / 4);
    expect(next.latitudeDelta).toBeCloseTo(sp.latitudeDelta / 4);
  });
});

describe("regiões iniciais", () => {
  it("regionAround centraliza no ponto com um zoom de bairro", () => {
    const r = regionAround({ lat: -22.9, lng: -43.2 });
    expect(r).toMatchObject({ latitude: -22.9, longitude: -43.2 });
    expect(r.latitudeDelta).toBeGreaterThan(0.01);
    expect(r.latitudeDelta).toBeLessThan(0.1);
  });

  it("a região padrão (sem localização) é válida", () => {
    expect(Math.abs(DEFAULT_REGION.latitude)).toBeLessThan(90);
    expect(DEFAULT_REGION.latitudeDelta).toBeGreaterThan(0);
  });
});

describe("conversão para o MapLibre (limites [oeste, sul, leste, norte])", () => {
  it("regionToBounds devolve a área visível na ordem do MapLibre", () => {
    const [west, south, east, north] = regionToBounds(sp);
    expect(west).toBeCloseTo(-46.65);
    expect(south).toBeCloseTo(-23.56);
    expect(east).toBeCloseTo(-46.61);
    expect(north).toBeCloseTo(-23.54);
  });

  it("boundsToRegion volta para centro + deltas", () => {
    const r = boundsToRegion([-46.65, -23.56, -46.61, -23.54]);
    expect(r.latitude).toBeCloseTo(-23.55);
    expect(r.longitude).toBeCloseTo(-46.63);
    expect(r.latitudeDelta).toBeCloseTo(0.02);
    expect(r.longitudeDelta).toBeCloseTo(0.04);
  });

  it("ida e volta preserva a região", () => {
    const r = boundsToRegion(regionToBounds(sp));
    expect(r.latitude).toBeCloseTo(sp.latitude, 10);
    expect(r.longitudeDelta).toBeCloseTo(sp.longitudeDelta, 10);
  });
});
