import type { PublicOccurrence } from "@miaucha/shared";
import {
  DEFAULT_MAP_FILTERS,
  PERIOD_OPTIONS,
  activeFilterCount,
  filtersToQuery,
  matchesFilters,
  sameFilters,
  type MapFilters,
} from "../filters";

const now = new Date("2026-11-20T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600 * 1000).toISOString();

const base: PublicOccurrence = {
  id: "o1",
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: null,
  color: null,
  description: null,
  photoUrls: [],
  publicLocation: { lat: -23.55, lng: -46.63 },
  approxAddress: null,
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: false,
  createdAt: hoursAgo(2),
};

describe("filtros do mapa (MP-05)", () => {
  it("o padrão mostra todos os tipos e espécies dos últimos 30 dias", () => {
    expect(DEFAULT_MAP_FILTERS).toEqual({ type: "all", species: "all", sinceDays: 30 });
    expect(activeFilterCount(DEFAULT_MAP_FILTERS)).toBe(0);
  });

  it("os períodos são 24 h, 7 dias e 30 dias", () => {
    expect(PERIOD_OPTIONS.map((p) => [p.days, p.label])).toEqual([
      [1, "24 h"],
      [7, "7 dias"],
      [30, "30 dias"],
    ]);
  });

  it("filtersToQuery só envia o que está filtrado, sempre com o período", () => {
    expect(filtersToQuery(DEFAULT_MAP_FILTERS)).toEqual({ sinceDays: 30 });
    expect(filtersToQuery({ type: "seen", species: "cat", sinceDays: 1 })).toEqual({ type: "seen", species: "cat", sinceDays: 1 });
  });

  it("activeFilterCount conta cada filtro diferente do padrão", () => {
    expect(activeFilterCount({ type: "lost", species: "all", sinceDays: 30 })).toBe(1);
    expect(activeFilterCount({ type: "lost", species: "dog", sinceDays: 7 })).toBe(3);
  });

  it("sameFilters compara pelo valor", () => {
    const a: MapFilters = { type: "lost", species: "all", sinceDays: 7 };
    expect(sameFilters(a, { ...a })).toBe(true);
    expect(sameFilters(a, { ...a, sinceDays: 1 })).toBe(false);
  });

  describe("matchesFilters (aplicado no cache, sem internet)", () => {
    it("aceita tudo no padrão", () => {
      expect(matchesFilters(base, DEFAULT_MAP_FILTERS, now)).toBe(true);
    });

    it("filtra por tipo e espécie", () => {
      expect(matchesFilters(base, { ...DEFAULT_MAP_FILTERS, type: "seen" }, now)).toBe(false);
      expect(matchesFilters(base, { ...DEFAULT_MAP_FILTERS, species: "cat" }, now)).toBe(false);
      expect(matchesFilters(base, { ...DEFAULT_MAP_FILTERS, type: "lost", species: "dog" }, now)).toBe(true);
    });

    it("filtra pelo período desde o registro", () => {
      const old = { ...base, createdAt: hoursAgo(30) };
      expect(matchesFilters(old, { ...DEFAULT_MAP_FILTERS, sinceDays: 1 }, now)).toBe(false);
      expect(matchesFilters(old, { ...DEFAULT_MAP_FILTERS, sinceDays: 7 }, now)).toBe(true);
    });
  });
});
