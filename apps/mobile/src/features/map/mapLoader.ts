import type { PublicOccurrence } from "@miaucha/shared";
import { ApiError } from "@/features/auth/apiSession";
import type { OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import { DEFAULT_MAP_FILTERS, filtersToQuery, matchesFilters, sameFilters, type MapFilters } from "./filters";
import type { MapCache } from "./mapCache";
import {
  FETCH_PADDING,
  REGION_DEBOUNCE_MS,
  isCompleteResult,
  regionToBBox,
  shouldRefetch,
  type FetchedArea,
  type Region,
} from "./region";

export type MapDataState = {
  occurrences: PublicOccurrence[];
  loading: boolean;
  /** Mostrando o último mapa salvo porque não há internet (MP-08). */
  offline: boolean;
  /** Região do mapa salvo, quando `offline`. */
  offlineRegion?: Region;
  error?: string;
};

export const OFFLINE_MESSAGE = "Sem conexão e nenhum mapa salvo ainda. Tente de novo quando estiver online.";

type Deps = {
  client: Pick<OccurrencesClient, "inArea">;
  cache: MapCache;
  onChange: (state: MapDataState) => void;
  debounceMs?: number;
  now?: () => Date;
};

/**
 * Busca as ocorrências da área visível do mapa (MP-02): espera o mapa parar de mexer, não busca de
 * novo quando a área visível ainda está dentro do que foi carregado, guarda o resultado no cache e,
 * sem internet, mostra o último mapa salvo (MP-08). Sem React: a tela só repassa os eventos.
 */
export function createMapLoader({ client, cache, onChange, debounceMs = REGION_DEBOUNCE_MS, now = () => new Date() }: Deps) {
  let state: MapDataState = { occurrences: [], loading: false, offline: false };
  let filters: MapFilters = DEFAULT_MAP_FILTERS;
  let region: Region | null = null;
  let fetched: FetchedArea | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latest = 0;

  /** Mantém a região do mapa salvo enquanto continuar offline. */
  const keepOffline = () => (state.offline ? { offline: true, offlineRegion: state.offlineRegion } : { offline: false });

  const emit = (next: MapDataState) => {
    state = next;
    onChange(state);
  };

  async function load(target: Region) {
    const request = ++latest;
    const bbox = regionToBBox(target, FETCH_PADDING);
    const requestFilters = filters;
    emit({ occurrences: state.occurrences, loading: true, ...keepOffline() });
    try {
      const occurrences = await client.inArea({ bbox, ...filtersToQuery(requestFilters) });
      if (request !== latest) return;
      fetched = { region: target, bbox, complete: isCompleteResult(occurrences.length) };
      emit({ occurrences, loading: false, offline: false });
      await cache.save({ region: target, occurrences, savedAt: now().toISOString() });
    } catch (error) {
      if (request !== latest) return;
      // Nada conta como carregado: o próximo movimento do mapa tenta a API de novo.
      fetched = null;
      if (error instanceof ApiError && error.status === 0) {
        const snapshot = await cache.load();
        if (request !== latest) return;
        if (snapshot) {
          const visible = snapshot.occurrences.filter((o) => matchesFilters(o, requestFilters, now()));
          emit({ occurrences: visible, loading: false, offline: true, offlineRegion: snapshot.region });
        } else {
          emit({ occurrences: state.occurrences, loading: false, offline: false, error: OFFLINE_MESSAGE });
        }
        return;
      }
      const message = error instanceof Error ? error.message : "Não foi possível carregar o mapa";
      emit({ occurrences: state.occurrences, loading: false, ...keepOffline(), error: message });
    }
  }

  function cancelPending() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  }

  return {
    /** Mapa mexeu (onRegionChangeComplete). Busca depois de `debounceMs`, se precisar. */
    regionChanged(next: Region) {
      region = next;
      cancelPending();
      timer = setTimeout(() => {
        timer = undefined;
        if (shouldRefetch(fetched, next)) void load(next);
      }, debounceMs);
    },
    /** Busca já, sem esperar (primeira carga). */
    loadNow(next: Region) {
      region = next;
      cancelPending();
      return load(next);
    },
    /** MP-05: filtros novos valem para a mesma área, na hora. */
    async setFilters(next: MapFilters) {
      if (sameFilters(next, filters)) return;
      filters = next;
      if (!region) return;
      cancelPending();
      await load(region);
    },
    async refresh() {
      if (!region) return;
      cancelPending();
      await load(region);
    },
    get filters() {
      return filters;
    },
    dispose() {
      cancelPending();
      latest++;
    },
  };
}

export type MapLoader = ReturnType<typeof createMapLoader>;
