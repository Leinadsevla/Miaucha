import { OCCURRENCE_SEARCH_LIMIT, type LatLng } from "@miaucha/shared";

/** Área visível do mapa: centro + tamanho em graus (o MapLibre usa limites; ver `regionToBounds`). */
export type Region = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

/** Área retangular no formato da API: `?bbox=minLng,minLat,maxLng,maxLat`. */
export type BBox = { minLng: number; minLat: number; maxLng: number; maxLat: number };

/** O que foi buscado por último: a região visível, a área pedida (com folga) e se veio tudo. */
export type FetchedArea = { region: Region; bbox: BBox; complete: boolean };

/** Zoom de bairro (~3 km de altura). */
export const LOCAL_DELTA = 0.03;

/** Sem localização: centro de São Paulo, com zoom de cidade. */
export const DEFAULT_REGION: Region = { latitude: -23.5505, longitude: -46.6333, latitudeDelta: 0.12, longitudeDelta: 0.12 };

/**
 * Folga pedida a mais em cada lado da área visível. Pequenos deslocamentos do mapa caem dentro
 * do que já foi carregado e não geram outra busca.
 */
export const FETCH_PADDING = 0.25;

/** Espera depois do último movimento do mapa antes de buscar (MP-02). */
export const REGION_DEBOUNCE_MS = 400;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function regionAround({ lat, lng }: LatLng, delta = LOCAL_DELTA): Region {
  return { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta };
}

/** Área visível de uma região, com `padding` (fração do tamanho) a mais em cada lado. */
export function regionToBBox(region: Region, padding = 0): BBox {
  const halfLat = (region.latitudeDelta / 2) * (1 + 2 * padding);
  const halfLng = (region.longitudeDelta / 2) * (1 + 2 * padding);
  return {
    minLng: clamp(region.longitude - halfLng, -180, 180),
    minLat: clamp(region.latitude - halfLat, -90, 90),
    maxLng: clamp(region.longitude + halfLng, -180, 180),
    maxLat: clamp(region.latitude + halfLat, -90, 90),
  };
}

/** Limites no formato do MapLibre: `[oeste, sul, leste, norte]`. */
export type LngLatBounds = [west: number, south: number, east: number, north: number];

export function regionToBounds(region: Region): LngLatBounds {
  const { minLng, minLat, maxLng, maxLat } = regionToBBox(region);
  return [minLng, minLat, maxLng, maxLat];
}

export function boundsToRegion([west, south, east, north]: LngLatBounds): Region {
  return { latitude: (south + north) / 2, longitude: (west + east) / 2, latitudeDelta: north - south, longitudeDelta: east - west };
}

export function bboxParam({ minLng, minLat, maxLng, maxLat }: BBox): string {
  return [minLng, minLat, maxLng, maxLat].map((n) => n.toFixed(5)).join(",");
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return inner.minLng >= outer.minLng && inner.maxLng <= outer.maxLng && inner.minLat >= outer.minLat && inner.maxLat <= outer.maxLat;
}

/**
 * MP-02: só busca de novo quando a área visível sai do que já foi carregado (com a folga) ou,
 * ao aproximar mais de um nível de zoom, quando o último resultado veio cortado no limite da API
 * (pode haver ocorrências que não vieram).
 */
export function shouldRefetch(last: FetchedArea | null, next: Region): boolean {
  if (!last) return true;
  if (!bboxContains(last.bbox, regionToBBox(next))) return true;
  return !last.complete && next.latitudeDelta < last.region.latitudeDelta / 2;
}

/** Se a busca trouxe tudo o que havia na área (menos que o limite por busca da API). */
export function isCompleteResult(count: number): boolean {
  return count < OCCURRENCE_SEARCH_LIMIT;
}

/** Nível de zoom "web mercator" (o do supercluster) para uma região exibida numa largura em pixels. */
export function regionToZoom(region: Region, widthPx: number): number {
  return Math.log2((360 * widthPx) / 256 / region.longitudeDelta);
}

/** Região centrada em `center` no nível de zoom pedido, mantendo a proporção da região atual. */
export function zoomInto(region: Region, center: LatLng, zoom: number, widthPx: number): Region {
  const longitudeDelta = (360 * widthPx) / 256 / 2 ** zoom;
  const ratio = region.latitudeDelta / region.longitudeDelta;
  return { latitude: center.lat, longitude: center.lng, latitudeDelta: longitudeDelta * ratio, longitudeDelta };
}
