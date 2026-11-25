export type LatLng = { lat: number; lng: number };

/** Raio médio da Terra (IUGG). */
const EARTH_RADIUS_METERS = 6_371_008.8;

/**
 * MP-07 pede deslocamento entre 50 e 200 m (~150 m). O sorteio fica um pouco para dentro dessa faixa:
 * o PostGIS mede no elipsoide e a conta aqui é na esfera (diferença de até ~0,5%).
 */
export const PUBLIC_OFFSET_MIN_METERS = 75;
export const PUBLIC_OFFSET_MAX_METERS = 190;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Distância em metros entre dois pontos (haversine). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Ponto público de uma ocorrência (MP-07): o ponto real deslocado numa direção aleatória, a uma distância
 * sorteada entre PUBLIC_OFFSET_MIN_METERS e PUBLIC_OFFSET_MAX_METERS. Gerado uma vez, na criação: sortear
 * de novo a cada leitura permitiria achar o ponto real pela média.
 * `random` é injetável nos testes (dois sorteios: distância e direção).
 */
export function publicPoint(lat: number, lng: number, random: () => number = Math.random): LatLng {
  const distance = PUBLIC_OFFSET_MIN_METERS + random() * (PUBLIC_OFFSET_MAX_METERS - PUBLIC_OFFSET_MIN_METERS);
  const bearing = random() * 2 * Math.PI;
  const angular = distance / EARTH_RADIUS_METERS;
  const lat1 = toRad(lat);
  const lng1 = toRad(lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing));
  const lng2 =
    lng1 + Math.atan2(Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1), Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  // Normaliza para [-180, 180) (perto da linha de data).
  const normalizedLng = ((((toDeg(lng2) + 180) % 360) + 360) % 360) - 180;
  return { lat: toDeg(lat2), lng: normalizedLng };
}

export function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}
