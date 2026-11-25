import { matchesSpeciesFilter, type OccurrenceType, type PublicOccurrence, type SpeciesFilter } from "@miaucha/shared";
import type { SearchFilters } from "@/features/occurrences/occurrencesClient";

export type PeriodDays = 1 | 7 | 30;

/** Filtros do mapa (MP-05). A API aceita um tipo e uma espécie por busca, então é "um ou todos". */
export type MapFilters = { type: OccurrenceType | "all"; species: SpeciesFilter | "all"; sinceDays: PeriodDays };

/** 30 dias equivale a "tudo": ocorrência sem atualização há 30 dias já expira (NF-03). */
export const DEFAULT_MAP_FILTERS: MapFilters = { type: "all", species: "all", sinceDays: 30 };

export const TYPE_OPTIONS: { value: MapFilters["type"]; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "lost", label: "Perdidos" },
  { value: "seen", label: "Avistados" },
  { value: "found", label: "Encontrados" },
];

export const SPECIES_OPTIONS: { value: MapFilters["species"]; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "dog", label: "Cães" },
  { value: "cat", label: "Gatos" },
  { value: "others", label: "Outros" },
];

export const PERIOD_OPTIONS: { days: PeriodDays; label: string }[] = [
  { days: 1, label: "24 h" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
];

export function filtersToQuery({ type, species, sinceDays }: MapFilters): SearchFilters {
  return { ...(type !== "all" ? { type } : {}), ...(species !== "all" ? { species } : {}), sinceDays };
}

export function activeFilterCount(filters: MapFilters): number {
  return (Object.keys(DEFAULT_MAP_FILTERS) as (keyof MapFilters)[]).filter((key) => filters[key] !== DEFAULT_MAP_FILTERS[key]).length;
}

export function sameFilters(a: MapFilters, b: MapFilters): boolean {
  return a.type === b.type && a.species === b.species && a.sinceDays === b.sinceDays;
}

const DAY_MS = 24 * 3600 * 1000;

/** Mesmo critério da API, para filtrar o último mapa salvo quando não há internet. */
export function matchesFilters(o: PublicOccurrence, filters: MapFilters, now: Date = new Date()): boolean {
  if (filters.type !== "all" && o.type !== filters.type) return false;
  if (filters.species !== "all" && !matchesSpeciesFilter(o.species, filters.species)) return false;
  return now.getTime() - new Date(o.createdAt).getTime() <= filters.sinceDays * DAY_MS;
}
