import { isValidLatLng, type LatLng } from "./geo";

/**
 * Precisão do geohash guardado no servidor para os alertas (AL-06): 6 caracteres ≈ célula de 1,2 km × 0,6 km.
 * O app calcula e envia só isto; a coordenada do usuário nunca sai do aparelho.
 */
export const ALERT_GEOHASH_PRECISION = 6;

const BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz";
const GEOHASH_RE = /^[0123456789bcdefghjkmnpqrstuvwxyz]+$/;

export type GeohashCell = { minLat: number; maxLat: number; minLng: number; maxLng: number; center: LatLng };

export type GeohashNeighbors = Record<"n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "nw", string | null>;

export function isValidGeohash(value: unknown, length?: number): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 12) return false;
  if (length !== undefined && value.length !== length) return false;
  return GEOHASH_RE.test(value);
}

/** Geohash do ponto (bits alternados de longitude e latitude, em base32). */
export function encodeGeohash(lat: number, lng: number, precision: number = ALERT_GEOHASH_PRECISION): string {
  if (!isValidLatLng(lat, lng)) throw new Error("Coordenada inválida");
  if (!Number.isInteger(precision) || precision < 1 || precision > 12) throw new Error("Precisão do geohash deve ser de 1 a 12");

  let [minLat, maxLat, minLng, maxLng] = [-90, 90, -180, 180];
  let hash = "";
  let bits = 0;
  let value = 0;
  let evenBit = true; // começa pela longitude
  while (hash.length < precision) {
    if (evenBit) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        value = value * 2 + 1;
        minLng = mid;
      } else {
        value *= 2;
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        value = value * 2 + 1;
        minLat = mid;
      } else {
        value *= 2;
        maxLat = mid;
      }
    }
    evenBit = !evenBit;
    if (++bits === 5) {
      hash += BASE32[value];
      bits = 0;
      value = 0;
    }
  }
  return hash;
}

/** Caixa da célula e o centro dela. */
export function decodeGeohash(hash: string): GeohashCell {
  if (!isValidGeohash(hash)) throw new Error("Geohash inválido");
  let [minLat, maxLat, minLng, maxLng] = [-90, 90, -180, 180];
  let evenBit = true;
  for (const char of hash) {
    const value = BASE32.indexOf(char);
    for (let bit = 4; bit >= 0; bit--) {
      const on = (value >> bit) & 1;
      if (evenBit) {
        const mid = (minLng + maxLng) / 2;
        if (on) minLng = mid;
        else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (on) minLat = mid;
        else maxLat = mid;
      }
      evenBit = !evenBit;
    }
  }
  return { minLat, maxLat, minLng, maxLng, center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 } };
}

const wrapLng = (lng: number) => ((((lng + 180) % 360) + 360) % 360) - 180;

/** As 8 células vizinhas, de mesma precisão. Além dos polos não há vizinha (null); na linha de data, dá a volta. */
export function geohashNeighbors(hash: string): GeohashNeighbors {
  const { center, minLat, maxLat, minLng, maxLng } = decodeGeohash(hash);
  const height = maxLat - minLat;
  const width = maxLng - minLng;
  const at = (dLat: number, dLng: number): string | null => {
    const lat = center.lat + dLat * height;
    if (lat > 90 || lat < -90) return null;
    return encodeGeohash(lat, wrapLng(center.lng + dLng * width), hash.length);
  };
  return {
    n: at(1, 0),
    ne: at(1, 1),
    e: at(0, 1),
    se: at(-1, 1),
    s: at(-1, 0),
    sw: at(-1, -1),
    w: at(0, -1),
    nw: at(1, -1),
  };
}

/** A célula e as vizinhas que existem, sem repetição. */
export function geohashWithNeighbors(hash: string): string[] {
  const all = [hash, ...Object.values(geohashNeighbors(hash))].filter((h): h is string => h !== null);
  return [...new Set(all)];
}
