import type { PublicOccurrence } from "@miaucha/shared";
import { createClusterIndex, expansionRegion, type MapItem } from "../clusters";
import { regionToZoom, type Region } from "../region";

const WIDTH = 400;

function occurrence(id: string, lat: number, lng: number): PublicOccurrence {
  return {
    id,
    type: "lost",
    species: "dog",
    petName: id,
    breed: null,
    color: null,
    description: null,
    photoUrls: [],
    publicLocation: { lat, lng },
    approxAddress: null,
    authorPseudonym: "Tutor Laranja 42",
    status: "open",
    isMine: false,
    createdAt: "2026-11-20T12:00:00Z",
  };
}

// Três pontos a ~100 m uns dos outros e um quarto a ~5 km.
const near = [occurrence("a", -23.55, -46.63), occurrence("b", -23.5509, -46.6309), occurrence("c", -23.5491, -46.6291)];
const far = occurrence("d", -23.595, -46.63);
const city: Region = { latitude: -23.57, longitude: -46.63, latitudeDelta: 0.2, longitudeDelta: 0.2 };
const street: Region = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.004, longitudeDelta: 0.004 };

const clusters = (items: MapItem[]) => items.filter((i) => i.kind === "cluster");
const points = (items: MapItem[]) => items.filter((i) => i.kind === "occurrence");

describe("clustering (MP-03)", () => {
  it("de longe, pontos próximos viram um grupo com a contagem; o distante fica sozinho", () => {
    const items = createClusterIndex([...near, far]).itemsIn(city, WIDTH);
    expect(clusters(items)).toEqual([expect.objectContaining({ kind: "cluster", count: 3 })]);
    expect(points(items).map((i) => i.kind === "occurrence" && i.occurrence.id)).toEqual(["d"]);
  });

  it("de perto, os pontos se separam", () => {
    const items = createClusterIndex([...near, far]).itemsIn(street, WIDTH);
    expect(clusters(items)).toEqual([]);
    expect(points(items).map((i) => i.kind === "occurrence" && i.occurrence.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("o grupo fica no centro dos pontos e o ponto usa o local público", () => {
    const items = createClusterIndex([...near, far]).itemsIn(city, WIDTH);
    const group = clusters(items)[0];
    expect(group.coordinate.lat).toBeCloseTo(-23.55, 2);
    expect(group.coordinate.lng).toBeCloseTo(-46.63, 2);
    const single = points(items)[0];
    expect(single.coordinate).toEqual(far.publicLocation);
  });

  it("tocar no grupo dá zoom até o nível em que ele se separa", () => {
    const index = createClusterIndex([...near, far]);
    const group = clusters(index.itemsIn(city, WIDTH))[0];
    if (group.kind !== "cluster") throw new Error("esperava um grupo");
    const next = expansionRegion(index, group, city, WIDTH);
    expect(regionToZoom(next, WIDTH)).toBeGreaterThan(regionToZoom(city, WIDTH));
    expect(next.latitude).toBeCloseTo(group.coordinate.lat);
    expect(next.longitude).toBeCloseTo(group.coordinate.lng);
    const after = index.itemsIn(next, WIDTH);
    expect(after.length).toBeGreaterThan(1);
    expect(after.some((i) => i.kind === "cluster" && i.count === 3)).toBe(false);
  });

  it("sem ocorrências, nenhum item", () => {
    expect(createClusterIndex([]).itemsIn(city, WIDTH)).toEqual([]);
  });
});
