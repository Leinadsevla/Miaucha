import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { AlertTriangle, Map as MapIcon, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SEARCH_RADIUS_OPTIONS_KM, colors, type PublicOccurrence } from "@miaucha/shared";
import { cn } from "@/lib/cn";
import { PetCard, PrimaryButton } from "@/components";
import type { GetLocation, LocationResult } from "@/features/location/currentLocation";
import { LocationProblem } from "@/features/location/LocationProblem";
import type { OccurrencesClient } from "./occurrencesClient";

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

export function lostNearbyLabel(count: number): string {
  if (count === 0) return "Nenhum pet perdido por perto";
  return count === 1 ? "1 pet perdido próximo" : `${count} pets perdidos próximos`;
}

/** Aba Início: pets perdidos, avistados e encontrados no raio escolhido (5 km de início, até 30 km). */
export function HomeScreen({ userName, getLocation, client, onOpen, onRegister, onOpenSettings, onOpenMap, refreshSignal, now }: Props) {
  const insets = useSafeAreaInsets();
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
        <View className="bg-primary px-5 pb-6" style={{ paddingTop: insets.top + 20 }}>
          {firstName ? <Text className="font-nunito-semibold text-xs text-white/70">Olá, {firstName}</Text> : null}
          <Text accessibilityRole="header" className="font-nunito-black text-lg text-white">
            Encontre pets perto de você
          </Text>
          <RadiusSelector value={radiusKm} onChange={setRadiusKm} />
        </View>

        <View className="gap-4 px-5 pt-4">
          {state.status === "loading" ? (
            <View className="items-center gap-3 py-10">
              <ActivityIndicator color={colors.primary} />
              <Text className="font-sans text-sm text-muted-foreground">Procurando pets perto de você...</Text>
            </View>
          ) : state.status === "location" ? (
            <LocationProblem
              result={state.result}
              purpose="mostrar os pets perto de você"
              onRetry={() => void load("full")}
              onOpenSettings={onOpenSettings}
            />
          ) : state.status === "error" ? (
            <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5">
              <Text className="text-center font-sans text-sm text-lost">{state.message}</Text>
              <PrimaryButton title="Tentar de novo" variant="outline" onPress={() => void load("full")} />
            </View>
          ) : (
            <NearbyList occurrences={state.occurrences} radiusKm={radiusKm} now={now} onOpen={onOpen} onOpenMap={onOpenMap} />
          )}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar pet perdido"
        onPress={onRegister}
        className="absolute bottom-4 right-5 flex-row items-center gap-2 rounded-2xl bg-accent px-4 py-3 shadow-lg active:opacity-90"
      >
        <Plus size={18} color={colors.white} />
        <Text className="font-nunito-bold text-sm text-white">Registrar pet perdido</Text>
      </Pressable>
    </View>
  );
}

function RadiusSelector({ value, onChange }: { value: number; onChange: (km: number) => void }) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-2">
      {SEARCH_RADIUS_OPTIONS_KM.map((km) => {
        const selected = km === value;
        return (
          <Pressable
            key={km}
            accessibilityRole="button"
            accessibilityLabel={`${km} km`}
            accessibilityState={{ selected }}
            onPress={() => onChange(km)}
            className={cn("rounded-xl px-3 py-1.5", selected ? "bg-white" : "bg-white/20")}
          >
            <Text className={cn("font-nunito-bold text-xs", selected ? "text-primary" : "text-white")}>{km} km</Text>
          </Pressable>
        );
      })}
    </View>
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
  return (
    <>
      <View
        className="flex-row items-center gap-3 rounded-2xl border p-3"
        style={{ backgroundColor: `${colors.seen}14`, borderColor: `${colors.seen}55` }}
      >
        <View className="h-8 w-8 items-center justify-center rounded-xl bg-seen">
          <AlertTriangle size={15} color={colors.white} />
        </View>
        <View className="flex-1">
          <Text className="font-nunito-bold text-xs text-foreground">{lostNearbyLabel(lost)}</Text>
          <Text className="font-sans text-xs text-muted-foreground">Raio de {radiusKm} km</Text>
        </View>
      </View>

      <View>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-nunito-bold text-sm text-foreground">Pets próximos</Text>
          {onOpenMap ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Ver no mapa" onPress={onOpenMap} className="flex-row items-center gap-1">
              <MapIcon size={14} color={colors.primary} />
              <Text className="font-nunito-bold text-xs text-primary">Ver no mapa</Text>
            </Pressable>
          ) : null}
        </View>
        {occurrences.length === 0 ? (
          <View className="items-center rounded-3xl border border-border bg-card p-5">
            <Text className="text-center font-sans text-sm text-muted-foreground">Nenhuma ocorrência num raio de {radiusKm} km.</Text>
          </View>
        ) : (
          // Grade de duas colunas. São no máximo 200 itens, e a tela já rola (ScrollView): sem lista virtualizada aninhada.
          <View testID="nearby-grid" style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
            {occurrences.map((item) => (
              <View key={item.id} style={{ width: "48.5%" }}>
                <PetCard occurrence={item} now={now} onPress={() => onOpen(item.id)} fill />
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
}
