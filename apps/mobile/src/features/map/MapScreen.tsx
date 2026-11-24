import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { CloudOff, LocateFixed, MapPinOff, SlidersHorizontal, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OCCURRENCE_TYPES, colors, occurrenceStyle, type LatLng } from "@miaucha/shared";
import type { GetLocation, LocationResult } from "@/features/location/currentLocation";
import type { OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import { createClusterIndex, expansionRegion } from "./clusters";
import { activeFilterCount, type MapFilters } from "./filters";
import type { MapCache } from "./mapCache";
import { createMapLoader, type MapDataState } from "./mapLoader";
import { MapFiltersSheet } from "./MapFiltersSheet";
import { MapCanvas, type MapCanvasRef } from "./MapCanvas";
import { ClusterMarker, OccurrenceMarker } from "./MapMarkers";
import { OccurrenceCard } from "./OccurrenceCard";
import { DEFAULT_REGION, bboxContains, regionAround, regionToBBox, type Region } from "./region";

export const OFFLINE_NOTICE = "Sem conexão: mostrando o último mapa carregado";

type Props = {
  getLocation: GetLocation;
  client: Pick<OccurrencesClient, "inArea">;
  cache: MapCache;
  onOpen: (id: string) => void;
  /** MP-06: recebe o ponto público (o app não conhece o exato). */
  onDirections: (point: LatLng) => void;
  onOpenSettings: () => void;
  /** Mude o valor para buscar de novo a mesma área (ex.: ao voltar para a aba). */
  refreshSignal?: number;
  now?: Date;
};

type Start = { region: Region; location: LocationResult; fromCache: boolean };

function countLabel(count: number) {
  if (count === 0) return "Nenhuma ocorrência nesta área";
  return count === 1 ? "1 ocorrência nesta área" : `${count} ocorrências nesta área`;
}

const FLOATING = { elevation: 4, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } };

/** Aba Mapa (MapScreen do protótipo): ocorrências da área visível, agrupadas, com filtros e cache offline. */
export function MapScreen({ getLocation, client, cache, onOpen, onDirections, onOpenSettings, refreshSignal, now }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const mapRef = useRef<MapCanvasRef>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [region, setRegion] = useState<Region | null>(null);
  const [data, setData] = useState<MapDataState>({ occurrences: [], loading: false, offline: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<MapFilters | null>(null);

  const loader = useMemo(() => createMapLoader({ client, cache, onChange: setData }), [client, cache]);
  useEffect(() => () => loader.dispose(), [loader]);

  // Começa na localização atual; sem ela, no último mapa salvo; sem ele, na região padrão.
  useEffect(() => {
    let active = true;
    void Promise.all([getLocation(), cache.load()]).then(([found, snapshot]) => {
      if (!active) return;
      const initial =
        found.status === "ok"
          ? { region: regionAround(found.coords), fromCache: false }
          : { region: snapshot?.region ?? DEFAULT_REGION, fromCache: !!snapshot };
      setLocation(found);
      setStart({ ...initial, location: found });
      setRegion(initial.region);
      void loader.loadNow(initial.region);
    });
    return () => {
      active = false;
    };
  }, [getLocation, cache, loader]);

  const firstSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === firstSignal.current) return;
    void loader.refresh();
  }, [refreshSignal, loader]);

  const index = useMemo(() => createClusterIndex(data.occurrences), [data.occurrences]);
  const items = useMemo(() => (region ? index.itemsIn(region, width) : []), [index, region, width]);
  const selected = data.occurrences.find((o) => o.id === selectedId) ?? null;
  const currentFilters = filters ?? loader.filters;
  const activeFilters = activeFilterCount(currentFilters);

  // MP-08: sem internet, se o mapa salvo é de outro lugar, leva até ele (uma vez).
  const movedToOffline = useRef(false);
  useEffect(() => {
    const target = data.offlineRegion;
    if (!target || !region || movedToOffline.current) return;
    movedToOffline.current = true;
    const center = { minLng: target.longitude, maxLng: target.longitude, minLat: target.latitude, maxLat: target.latitude };
    if (!bboxContains(regionToBBox(region), center)) mapRef.current?.animateToRegion(target, 500);
  }, [data.offlineRegion, region]);

  function onRegionChangeComplete(next: Region) {
    setRegion(next);
    loader.regionChanged(next);
  }

  async function locate() {
    const found = await getLocation();
    setLocation(found);
    if (found.status === "ok") {
      setNoticeDismissed(false);
      mapRef.current?.animateToRegion(regionAround(found.coords), 500);
    }
  }

  function applyFilters(next: MapFilters) {
    setFilters(next);
    setFiltersOpen(false);
    void loader.setFilters(next);
  }

  if (!start || !region) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background">
        <ActivityIndicator color={colors.primary} />
        <Text className="font-sans text-sm text-muted-foreground">Procurando sua localização...</Text>
      </View>
    );
  }

  const locationProblem = location && location.status !== "ok" ? location : null;

  return (
    <View className="flex-1 bg-background">
      <MapCanvas
        ref={mapRef}
        initialRegion={start.region}
        showsUserLocation={location?.status === "ok"}
        onRegionChangeComplete={onRegionChangeComplete}
        onPress={() => setSelectedId(null)}
      >
        {items.map((item) =>
          item.kind === "cluster" ? (
            <ClusterMarker
              key={`cluster-${item.id}`}
              cluster={item}
              onPress={() => mapRef.current?.animateToRegion(expansionRegion(index, item, region, width), 400)}
            />
          ) : (
            <OccurrenceMarker
              key={item.occurrence.id}
              occurrence={item.occurrence}
              selected={item.occurrence.id === selectedId}
              onPress={() => setSelectedId(item.occurrence.id)}
            />
          ),
        )}
      </MapCanvas>

      <View pointerEvents="box-none" className="absolute left-0 right-0 top-0 gap-2 px-4" style={{ paddingTop: insets.top + 12 }}>
        <View pointerEvents="box-none" className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3" style={FLOATING}>
            {data.loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text className="flex-1 font-nunito-bold text-sm text-foreground">
              {data.loading && data.occurrences.length === 0 ? "Carregando ocorrências..." : countLabel(data.occurrences.length)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={activeFilters > 0 ? `Filtros (${activeFilters} ${activeFilters === 1 ? "ativo" : "ativos"})` : "Filtros"}
            onPress={() => setFiltersOpen(true)}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-white"
            style={FLOATING}
          >
            <SlidersHorizontal size={18} color={colors.foreground} />
            {activeFilters > 0 ? (
              <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-primary">
                <Text className="font-nunito-black text-[10px] text-white">{activeFilters}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {data.offline ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-foreground px-4 py-3" style={FLOATING}>
            <CloudOff size={16} color={colors.white} />
            <Text className="flex-1 font-nunito-semibold text-xs text-white">{OFFLINE_NOTICE}</Text>
          </View>
        ) : null}

        {data.error ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-white px-4 py-3" style={FLOATING}>
            <Text className="flex-1 font-nunito-semibold text-xs text-lost">{data.error}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tentar de novo" onPress={() => void loader.refresh()} hitSlop={8}>
              <Text className="font-nunito-bold text-xs text-primary">Tentar de novo</Text>
            </Pressable>
          </View>
        ) : null}

        {locationProblem && !noticeDismissed ? (
          <LocationNotice
            result={locationProblem}
            fromCache={start.fromCache}
            onAllow={() => void locate()}
            onOpenSettings={onOpenSettings}
            onDismiss={() => setNoticeDismissed(true)}
          />
        ) : null}

        <Legend />
      </View>

      <View pointerEvents="box-none" className="absolute bottom-4 left-4 right-4 gap-3">
        {location?.status === "ok" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minha localização"
            onPress={() => void locate()}
            className="h-12 w-12 items-center justify-center self-end rounded-2xl bg-white"
            style={FLOATING}
          >
            <LocateFixed size={20} color={colors.accent} />
          </Pressable>
        ) : null}
        {selected ? (
          <OccurrenceCard occurrence={selected} now={now} onOpen={onOpen} onDirections={onDirections} onClose={() => setSelectedId(null)} />
        ) : null}
      </View>

      <MapFiltersSheet visible={filtersOpen} filters={currentFilters} onApply={applyFilters} onClose={() => setFiltersOpen(false)} />
    </View>
  );
}

/** Legenda das cores (MP-01): o ícone dentro do marcador diz a espécie. */
function Legend() {
  return (
    <View className="gap-1.5 self-end rounded-2xl bg-white p-3" style={FLOATING}>
      {OCCURRENCE_TYPES.map((type) => {
        const { color, label } = occurrenceStyle(type);
        return (
          <View key={type} className="flex-row items-center gap-2">
            <View className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
            <Text className="font-nunito-semibold text-xs text-foreground">{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function LocationNotice({
  result,
  fromCache,
  onAllow,
  onOpenSettings,
  onDismiss,
}: {
  result: Exclude<LocationResult, { status: "ok" }>;
  fromCache: boolean;
  onAllow: () => void;
  onOpenSettings: () => void;
  onDismiss: () => void;
}) {
  const blocked = result.status === "denied" && !result.canAskAgain;
  const where = fromCache ? "o último mapa salvo" : "o centro de São Paulo";
  const message =
    result.status === "denied"
      ? `Sem acesso à sua localização: mostrando ${where}. Arraste o mapa até a sua região.`
      : `Não achamos sua localização: mostrando ${where}. Confira se o GPS está ligado.`;
  return (
    <View className="gap-2 rounded-2xl bg-white p-4" style={FLOATING}>
      <View className="flex-row items-start gap-2">
        <MapPinOff size={16} color={colors.primary} />
        <Text className="flex-1 font-sans text-xs text-foreground">{message}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Fechar aviso" onPress={onDismiss} hitSlop={12}>
          <X size={14} color={colors.mutedForeground} />
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={blocked ? "Abrir configurações" : result.status === "denied" ? "Permitir localização" : "Tentar de novo"}
        onPress={blocked ? onOpenSettings : onAllow}
        className="self-start rounded-xl bg-primary px-3 py-2"
      >
        <Text className="font-nunito-bold text-xs text-white">
          {blocked ? "Abrir configurações" : result.status === "denied" ? "Permitir localização" : "Tentar de novo"}
        </Text>
      </Pressable>
    </View>
  );
}
