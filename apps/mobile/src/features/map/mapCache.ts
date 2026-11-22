import { File, Paths } from "expo-file-system";
import { OCCURRENCE_SEARCH_LIMIT, type PublicOccurrence } from "@miaucha/shared";
import type { Region } from "./region";

/** Último mapa carregado com internet: mostrado quando a busca falha por falta de rede (MP-08). */
export type MapSnapshot = { region: Region; occurrences: PublicOccurrence[]; savedAt: string };

/** Onde o texto do cache fica; injetável nos testes. */
export type TextStore = { read(): Promise<string | null>; write(text: string): Promise<void>; clear(): Promise<void> };

export type MapCache = { load(): Promise<MapSnapshot | null>; save(snapshot: MapSnapshot): Promise<void>; clear(): Promise<void> };

const VERSION = 1;

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function isRegion(v: unknown): v is Region {
  const r = v as Region | null;
  return !!r && isNumber(r.latitude) && isNumber(r.longitude) && isNumber(r.latitudeDelta) && isNumber(r.longitudeDelta);
}

function isOccurrence(v: unknown): v is PublicOccurrence {
  const o = v as PublicOccurrence | null;
  return !!o && typeof o.id === "string" && !!o.publicLocation && isNumber(o.publicLocation.lat) && isNumber(o.publicLocation.lng);
}

/** Cache do mapa. Nunca lança: sem cache (ou com cache estragado) a tela só não tem o que mostrar offline. */
export function createMapCache(store: TextStore): MapCache {
  return {
    async load() {
      try {
        const text = await store.read();
        if (!text) return null;
        const data = JSON.parse(text) as { version?: unknown } & Partial<MapSnapshot>;
        if (data.version !== VERSION || !isRegion(data.region) || !Array.isArray(data.occurrences) || typeof data.savedAt !== "string") {
          return null;
        }
        return { region: data.region, occurrences: data.occurrences.filter(isOccurrence), savedAt: data.savedAt };
      } catch {
        return null;
      }
    },
    async save({ region, occurrences, savedAt }) {
      try {
        await store.write(JSON.stringify({ version: VERSION, region, occurrences: occurrences.slice(0, OCCURRENCE_SEARCH_LIMIT), savedAt }));
      } catch {
        // Sem espaço ou erro de disco: o mapa continua funcionando online.
      }
    },
    async clear() {
      try {
        await store.clear();
      } catch {
        // nada a fazer
      }
    },
  };
}

/**
 * Arquivo na pasta de documentos do app (expo-file-system, incluído no Expo Go). Não use o
 * expo-secure-store: ele é para segredos pequenos (o limite por item é de ~2 KB no iOS).
 */
export function createFileTextStore(name: string): TextStore {
  const file = () => new File(Paths.document, name);
  return {
    async read() {
      const f = file();
      return f.exists ? f.text() : null;
    },
    async write(text) {
      await file().write(text);
    },
    async clear() {
      const f = file();
      if (f.exists) f.delete();
    },
  };
}

/** Cache padrão do app. Só guarda dados públicos (local deslocado, pseudônimo), nunca o ponto exato. */
export const mapCache = createMapCache(createFileTextStore("ultimo-mapa.json"));
