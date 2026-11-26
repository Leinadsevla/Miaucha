import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, ChevronRight, CloudOff, Map as MapIcon, Plus, SearchX } from "lucide-react-native";
import { SEARCH_RADIUS_OPTIONS_KM, colors, elevation, withAlpha, type PublicOccurrence } from "@miaucha/shared";
import { cn } from "@/lib/cn";
import { EmptyState, GradientHeader, PetCard, Skeleton } from "@/components";
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <GradientHeader eyebrow={firstName ? `Olá, ${firstName}` : undefined} title="Encontre pets perto de você">
          <RadiusSelector value={radiusKm} onChange={setRadiusKm} />
        </GradientHeader>

        <View className="gap-5 px-5 pt-5" style={centered(PAGE_MAX_WIDTH)}>
          {state.status === "loading" ? (
            <View accessible accessibilityLabel="Procurando pets perto de você..." className="gap-4">
              <Text className="font-nunito-semibold text-sm text-muted-foreground">Procurando pets perto de você...</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[0, 1].map((i) => (
                  <View key={i} className="gap-2 rounded-3xl border border-border bg-card p-3" style={[{ width: "48.5%", maxWidth: 280 }, elevation.card]}>
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
              icon={<CloudOff size={28} color={colors.primaryDeep} />}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar ocorrência"
        onPress={onRegister}
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
          { position: "absolute", bottom: 20, right: 20, borderRadius: 20, transform: [{ translateY: hovered && !pressed ? -2 : 0 }, { scale: pressed ? 0.97 : 1 }] },
          elevation.floating,
        ]}
      >
        {/* Laranja da marca com texto escuro (branco sobre ele não tem contraste). */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, paddingHorizontal: 22 }}
        >
          <Plus size={20} color={colors.foreground} strokeWidth={2.8} />
          <Text className="font-nunito-black text-base text-foreground">Registrar ocorrência</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

function RadiusSelector({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }} style={{ marginHorizontal: -20 }}>
      <View style={{ width: 12 }} />
      {SEARCH_RADIUS_OPTIONS_KM.map((km) => {
        const selected = km === value;
        return (
          <Pressable
            key={km}
            accessibilityRole="button"
            accessibilityLabel={`${km} km`}
            accessibilityState={{ selected }}
            onPress={() => onChange(km)}
            hitSlop={4}
            className={cn("items-center justify-center rounded-full px-4", selected ? "bg-white" : "bg-white/20")}
            style={{ minHeight: 40 }}
          >
            <Text className={cn("text-sm", selected ? "font-nunito-black text-foreground" : "font-nunito-bold text-white")}>{km} km</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

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
  const { petColumns, contentWidth } = useLayout();
  // Largura da grade = conteúdo (até o máximo da página) menos o respiro lateral de 20 px de cada lado.
  const gridWidth = Math.min(contentWidth, PAGE_MAX_WIDTH) - 40;
  const cardWidth = Math.floor((gridWidth - GRID_GAP * (petColumns - 1)) / petColumns);
  return (
    <>
      <View
        className="flex-row items-center gap-3 rounded-3xl border p-4"
        style={{ backgroundColor: withAlpha(colors.seen, 0.08), borderColor: withAlpha(colors.seen, 0.35) }}
      >
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-seen">
          <AlertTriangle size={18} color={colors.foreground} />
        </View>
        <View className="flex-1">
          <Text className="font-nunito-black text-sm text-foreground">{lostNearbyLabel(lost)}</Text>
          <Text className="font-sans text-xs text-muted-foreground">Raio de {radiusKm} km</Text>
        </View>
      </View>

      <View>
        <View className="mb-2 flex-row items-center justify-between">
          <Text accessibilityRole="header" className="font-nunito-black text-lg text-foreground">
            Pets próximos
          </Text>
          {onOpenMap ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ver no mapa"
              onPress={onOpenMap}
              style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, opacity: pressed ? 0.6 : 1 })}
            >
              <MapIcon size={16} color={colors.accent} />
              <Text className="font-nunito-bold text-sm text-accent">Ver no mapa</Text>
              <ChevronRight size={16} color={colors.accent} />
            </Pressable>
          ) : null}
        </View>
        {occurrences.length === 0 ? (
          <EmptyState
            icon={<SearchX size={28} color={colors.primaryDeep} />}
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
