import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { ChevronRight, CloudOff, Map as MapIcon, Plus, Radar, SearchX } from "lucide-react-native";
import { SEARCH_RADIUS_OPTIONS_KM, colors, elevation, withAlpha, type PublicOccurrence } from "@miaucha/shared";
import { EmptyState, FilterChips, PetCard, Skeleton, TabHeader } from "@/components";
import type { GetLocation, LocationResult } from "@/features/location/currentLocation";
import { LocationProblem } from "@/features/location/LocationProblem";
import type { OccurrencesClient } from "./occurrencesClient";
import { centered, PAGE_MAX_WIDTH, useLayout } from "@/lib/layout";

/** Raio inicial da busca; o usuário escolhe outro entre `SEARCH_RADIUS_OPTIONS_KM` (até 30 km). */
export const HOME_RADIUS_KM = 5;

type State =
  | { status: "loading" }
  | { status: "location"; result: Exclude<LocationResult, { status: "ok" }> }
  | { status: "error"; message: string }
  | { status: "ready"; occurrences: PublicOccurrence[] };

type Props = {
  userName: string;
  getLocation: GetLocation;
  client: OccurrencesClient;
  onOpen: (id: string) => void;
  onRegister: () => void;
  onOpenSettings: () => void;
  onOpenMap?: () => void;
  /** Mude o valor para recarregar sem mostrar "carregando" (ex.: ao voltar para a aba). */
  refreshSignal?: number;
  now?: Date;
};

const GRID_GAP = 12;

export function lostNearbyLabel(count: number): string {
  if (count === 0) return "Nenhum pet perdido por perto";
  return count === 1 ? "1 pet perdido próximo" : `${count} pets perdidos próximos`;
}

/** Aba Início: pets perdidos, avistados e encontrados no raio escolhido (5 km de início, até 30 km). */
export function HomeScreen({ userName, getLocation, client, onOpen, onRegister, onOpenSettings, onOpenMap, refreshSignal, now }: Props) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [radiusKm, setRadiusKm] = useState(HOME_RADIUS_KM);
  // Só a resposta do pedido mais recente vale (evita uma busca antiga sobrescrever uma nova).
  const latest = useRef(0);

  const load = useCallback(
    async (mode: "full" | "refresh" | "silent") => {
      const request = ++latest.current;
      if (mode === "full") setState({ status: "loading" });
      if (mode === "refresh") setRefreshing(true);
      let next: State;
      try {
        const location = await getLocation();
        if (location.status !== "ok") {
          next = { status: "location", result: location };
        } else {
          const occurrences = await client.nearby({ ...location.coords, radiusKm });
          next = { status: "ready", occurrences };
        }
      } catch (e) {
        next = { status: "error", message: e instanceof Error ? e.message : "Não foi possível carregar os pets próximos" };
      }
      if (request !== latest.current) return;
      setState(next);
      setRefreshing(false);
    },
    [client, getLocation, radiusKm],
  );

  useEffect(() => {
    void load("full");
  }, [load]);

  const firstSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === firstSignal.current) return;
    void load("silent");
  }, [refreshSignal, load]);

  const firstName = userName.trim().split(/\s+/)[0];

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        testID="home-scroll"
        contentContainerStyle={{ paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.brand} colors={[colors.brand]} />}
      >
        <TabHeader eyebrow={firstName ? `Olá, ${firstName}` : undefined} title="Encontre pets perto de você" maxWidth={PAGE_MAX_WIDTH}>
          <FilterChips options={RADIUS_OPTIONS} value={String(radiusKm)} onChange={(km) => setRadiusKm(Number(km))} />
        </TabHeader>

        <View className="gap-5 px-5 pt-5" style={centered(PAGE_MAX_WIDTH)}>
          {state.status === "loading" ? (
            <View accessible accessibilityLabel="Procurando pets perto de você..." className="gap-4">
              <Text className="font-ui-semibold text-sm text-muted-foreground">Procurando pets perto de você...</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[0, 1].map((i) => (
                  <View key={i} className="gap-2 rounded-[20px] border border-border bg-card p-3" style={[{ width: "48.5%", maxWidth: 280 }, elevation.card]}>
                    <Skeleton height={110} radius={16} />
                    <Skeleton width="70%" />
                    <Skeleton width="50%" height={12} />
                  </View>
                ))}
              </View>
            </View>
          ) : state.status === "location" ? (
            <LocationProblem
              result={state.result}
              purpose="mostrar os pets perto de você"
              onRetry={() => void load("full")}
              onOpenSettings={onOpenSettings}
            />
          ) : state.status === "error" ? (
            <EmptyState
              icon={<CloudOff size={28} color={colors.brand} />}
              title="Não deu para carregar"
              message={state.message}
              actionLabel="Tentar de novo"
              onAction={() => void load("full")}
            />
          ) : (
            <NearbyList occurrences={state.occurrences} radiusKm={radiusKm} now={now} onOpen={onOpen} onOpenMap={onOpenMap} />
          )}
        </View>
      </ScrollView>

      {/* A ação da tela: a única peça sólida na cor da marca que fica sempre à vista. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar ocorrência"
        onPress={onRegister}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          {
            position: "absolute",
            bottom: 20,
            right: 20,
            minHeight: 54,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            borderRadius: 18,
            paddingHorizontal: 20,
            backgroundColor: pressed || hovered ? colors.brandDeep : colors.brand,
          },
          elevation.floating,
        ]}
      >
        <Plus size={20} color={colors.white} strokeWidth={2.6} />
        <Text className="font-ui-bold text-base text-white">Registrar ocorrência</Text>
      </Pressable>
    </View>
  );
}

const RADIUS_OPTIONS = SEARCH_RADIUS_OPTIONS_KM.map((km) => ({ key: String(km), label: `${km} km` }));

function NearbyList({
  occurrences,
  radiusKm,
  now,
  onOpen,
  onOpenMap,
}: {
  occurrences: PublicOccurrence[];
  radiusKm: number;
  now?: Date;
  onOpen: (id: string) => void;
  onOpenMap?: () => void;
}) {
  const lost = occurrences.filter((o) => o.type === "lost").length;
  const { petColumns, contentWidth, wide } = useLayout();
  // Largura da grade = conteúdo (até o máximo da página) menos o respiro lateral de 20 px de cada lado.
  const gridWidth = Math.min(contentWidth, PAGE_MAX_WIDTH) - 40;
  const cardWidth = Math.floor((gridWidth - GRID_GAP * (petColumns - 1)) / petColumns);
  const openMap = onOpenMap ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Ver no mapa"
      onPress={onOpenMap}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => ({
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        borderRadius: 12,
        paddingHorizontal: 14,
        backgroundColor: pressed || hovered ? colors.brandSoft : colors.white,
      })}
    >
      <MapIcon size={16} color={colors.brand} />
      <Text className="font-ui-bold text-sm text-brand">Ver no mapa</Text>
      <ChevronRight size={16} color={colors.brand} />
    </Pressable>
  ) : null;
  return (
    <>
      {/* O destaque da tela: o único bloco na cor da marca. */}
      <View className="rounded-[20px] bg-brand p-5" style={wide ? { flexDirection: "row", alignItems: "center", gap: 16 } : { gap: 16 }}>
        <View className="flex-1 flex-row items-center gap-3.5">
          <View className="h-12 w-12 items-center justify-center rounded-2xl" style={{ backgroundColor: withAlpha(colors.white, 0.16) }}>
            <Radar size={24} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="font-ui-extrabold text-lg tracking-tight text-white">{lostNearbyLabel(lost)}</Text>
            <Text className="mt-0.5 font-ui-medium text-sm text-white">Raio de {radiusKm} km</Text>
          </View>
        </View>
        {openMap}
      </View>

      <View>
        <View className="mb-3 flex-row items-baseline justify-between">
          <Text accessibilityRole="header" className="font-ui-extrabold text-lg tracking-tight text-foreground">
            Pets próximos
          </Text>
          {occurrences.length > 0 ? (
            <Text className="font-ui-medium text-sm text-muted-foreground">{occurrences.length === 1 ? "1 ocorrência" : `${occurrences.length} ocorrências`}</Text>
          ) : null}
        </View>
        {occurrences.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} color={colors.brand} />}
            title="Tudo tranquilo por aqui"
            message={`Nenhuma ocorrência num raio de ${radiusKm} km.`}
          />
        ) : (
          // Grade de 2 a 4 colunas, conforme a largura. São no máximo 200 itens, e a tela já rola (ScrollView): sem lista virtualizada aninhada.
          <View testID="nearby-grid" style={{ flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP }}>
            {occurrences.map((item) => (
              <View key={item.id} style={{ width: cardWidth }}>
                <PetCard occurrence={item} now={now} onPress={() => onOpen(item.id)} fill />
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
