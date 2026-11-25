import { MAX_SEARCH_RADIUS_KM, OCCURRENCE_TYPES, isSpeciesFilter, isValidLatLng, type OccurrenceType, type SpeciesFilter } from "@miaucha/shared";

export type SearchArea =
  | { kind: "radius"; lat: number; lng: number; radiusMeters: number }
  | { kind: "bbox"; minLng: number; minLat: number; maxLng: number; maxLat: number };

export type SearchFilters = { type?: OccurrenceType; species?: SpeciesFilter; sinceDays?: number };

export type OccurrenceSearch = { area: SearchArea; filters: SearchFilters };

export const DEFAULT_RADIUS_KM = 5;
const MAX_SINCE_DAYS = 365;
const BBOX_ERROR = "bbox inválida: use minLng,minLat,maxLng,maxLat";

/** Só aceita um valor simples: `?lat=1&lat=2` chega como array e é recusado. */
const param = (query: Record<string, unknown>, key: string): string | undefined => {
  const value = query[key];
  if (value === undefined) return undefined;
  return typeof value === "string" ? value : "\u0000";
};

/** Number("") é 0; aqui texto vazio é inválido. */
const toNumber = (value: string | undefined) => (value === undefined || value.trim() === "" ? Number.NaN : Number(value));

function parseFilters(query: Record<string, unknown>): SearchFilters | { error: string } {
  const filters: SearchFilters = {};
  const type = param(query, "type");
  if (type !== undefined) {
    if (!(OCCURRENCE_TYPES as readonly string[]).includes(type)) return { error: "Tipo inválido" };
    filters.type = type as OccurrenceType;
  }
  const species = param(query, "species");
  if (species !== undefined) {
    if (!isSpeciesFilter(species)) return { error: "Espécie inválida" };
    filters.species = species;
  }
  const sinceDays = param(query, "sinceDays");
  if (sinceDays !== undefined) {
    const days = toNumber(sinceDays);
    if (!Number.isInteger(days) || days < 1 || days > MAX_SINCE_DAYS) return { error: "Período inválido" };
    filters.sinceDays = days;
  }
  return filters;
}

function parseArea(query: Record<string, unknown>): SearchArea | { error: string } {
  const bbox = param(query, "bbox");
  if (bbox !== undefined) {
    const parts = bbox.split(",").map((p) => toNumber(p));
    if (parts.length !== 4) return { error: BBOX_ERROR };
    const [minLng, minLat, maxLng, maxLat] = parts;
    if (!isValidLatLng(minLat, minLng) || !isValidLatLng(maxLat, maxLng) || minLng >= maxLng || minLat >= maxLat) {
      return { error: BBOX_ERROR };
    }
    return { kind: "bbox", minLng, minLat, maxLng, maxLat };
  }

  const latRaw = param(query, "lat");
  const lngRaw = param(query, "lng");
  if (latRaw === undefined && lngRaw === undefined) return { error: "Informe lat e lng (com radiusKm) ou bbox" };
  const lat = toNumber(latRaw);
  const lng = toNumber(lngRaw);
  if (!isValidLatLng(lat, lng)) return { error: "Coordenadas inválidas" };

  const radiusRaw = param(query, "radiusKm");
  const radiusKm = radiusRaw === undefined ? DEFAULT_RADIUS_KM : toNumber(radiusRaw);
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) return { error: "Informe um raio válido" };
  if (radiusKm > MAX_SEARCH_RADIUS_KM) return { error: `O raio máximo é de ${MAX_SEARCH_RADIUS_KM} km` };
  return { kind: "radius", lat, lng, radiusMeters: radiusKm * 1000 };
}

/** Lê a query de `GET /occurrences` (MP-02): raio (lat, lng, radiusKm) ou bbox, mais filtros (MP-05). */
export function parseOccurrenceSearch(query: Record<string, unknown>): OccurrenceSearch | { error: string } {
  const area = parseArea(query);
  if ("error" in area) return area;
  const filters = parseFilters(query);
  if ("error" in filters) return filters;
  return { area, filters };
}
