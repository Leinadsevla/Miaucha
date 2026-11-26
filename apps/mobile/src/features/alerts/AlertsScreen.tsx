import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { BellRing, Clock, CloudOff, MapPin, SlidersHorizontal } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation, speciesLabel, formatApproxDistance, formatTimeAgo, type AlertItem } from "@miaucha/shared";
import { AppLogo, EmptyState, FilterChips, MISSING_REGION, SkeletonList, SpeciesIcon, StatusBadge, TabHeader } from "@/components";
import type { AlertsClient } from "./alertsClient";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

export type DistanceFilter = "all" | "under1" | "1to3" | "3to5";

const FILTERS: { key: DistanceFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "under1", label: "< 1 km" },
  { key: "1to3", label: "1–3 km" },
  { key: "3to5", label: "3–5 km" },
];

/** Avistamento do meu pet aparece em qualquer filtro: a distância dele é de onde o pet sumiu, não de mim. */
export function filterAlerts(alerts: AlertItem[], filter: DistanceFilter): AlertItem[] {
  const km = (a: AlertItem) => a.distanceMeters / 1000;
  const within = (a: AlertItem): boolean => {
    switch (filter) {
      case "all":
        return true;
      case "under1":
        return km(a) < 1;
      case "1to3":
        return km(a) >= 1 && km(a) < 3;
      case "3to5":
        return km(a) >= 3;
    }
  };
  return alerts.filter((a) => a.sighting || within(a));
}

export const alertTitle = (a: AlertItem) => a.occurrence.petName ?? `${speciesLabel(a.occurrence.species)} sem nome`;

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; alerts: AlertItem[] };

type Props = {
  client: AlertsClient;
  onOpen: (occurrenceId: string) => void;
  onOpenPreferences: () => void;
  /** Explica por que o push não chega (Expo Go, permissão negada...). */
  pushNotice?: string | null;
  /** Mude o valor para recarregar sem "carregando" (ex.: ao voltar para a aba). */
  refreshSignal?: number;
  now?: Date;
};

/** Aba Alertas: o que o servidor avisou dentro do raio escolhido (AL-01). Funciona sem push. */
export function AlertsScreen({ client, onOpen, onOpenPreferences, pushNotice, refreshSignal, now }: Props) {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DistanceFilter>("all");
  const latest = useRef(0);

  const load = useCallback(
    async (mode: "full" | "refresh" | "silent") => {
      const request = ++latest.current;
      if (mode === "full") setState({ status: "loading" });
      if (mode === "refresh") setRefreshing(true);
      let next: State;
      try {
        next = { status: "ready", alerts: await client.list() };
      } catch (e) {
        next = { status: "error", message: e instanceof Error ? e.message : "Não foi possível carregar os alertas" };
      }
      if (request !== latest.current) return;
      setState(next);
      setRefreshing(false);
    },
    [client],
  );

  useEffect(() => {
    void load("full");
  }, [load]);

  const firstSignal = useRef(refreshSignal);
  useEffect(() => {
    if (refreshSignal === firstSignal.current) return;
    void load("silent");
  }, [refreshSignal, load]);

  function open(alert: AlertItem) {
    if (!alert.seenAt) {
      const seenAt = new Date().toISOString();
      setState((s) => (s.status === "ready" ? { ...s, alerts: s.alerts.map((a) => (a.id === alert.id ? { ...a, seenAt } : a)) } : s));
      client.markSeen(alert.id).catch(() => {});
    }
    onOpen(alert.occurrenceId);
  }

  return (
    <View className="flex-1 bg-background">
      <TabHeader
        title="Alertas"
        subtitle="Pets desaparecidos próximos a você"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preferências de alerta"
            onPress={onOpenPreferences}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderRadius: 14,
              paddingHorizontal: 14,
              backgroundColor: pressed ? colors.border : colors.muted,
            })}
          >
            <SlidersHorizontal size={16} color={colors.foreground} />
            <Text className="font-nunito-bold text-sm text-foreground">Preferências</Text>
          </Pressable>
        }
      >
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      </TabHeader>

      <ScrollView
        contentContainerStyle={{ ...centered(READING_MAX_WIDTH), padding: 20, paddingBottom: 96, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {pushNotice ? (
          <View className="flex-row items-center gap-2 px-1">
            <BellRing size={14} color={colors.mutedForeground} />
            <Text className="flex-1 font-sans text-xs text-muted-foreground">{pushNotice}</Text>
          </View>
        ) : null}

        {state.status === "loading" ? (
          <View className="gap-3">
            <Text className="font-nunito-semibold text-sm text-muted-foreground">Carregando alertas...</Text>
            <SkeletonList count={3} />
          </View>
        ) : state.status === "error" ? (
          <EmptyState
            icon={<CloudOff size={28} color={colors.primaryDeep} />}
            title="Não deu para carregar"
            message={state.message}
            actionLabel="Tentar de novo"
            onAction={() => void load("full")}
          />
        ) : state.alerts.length === 0 ? (
          <EmptyState
            icon={<AppLogo size={40} />}
            title="Nenhum alerta por enquanto"
            message="Quando um pet sumir dentro do seu raio, ele aparece aqui."
          />
        ) : filterAlerts(state.alerts, filter).length === 0 ? (
          <Text className="py-6 text-center font-sans text-sm text-muted-foreground">Nenhum alerta nesta distância.</Text>
        ) : (
          filterAlerts(state.alerts, filter).map((a) => <AlertCard key={a.id} alert={a} now={now} onPress={() => open(a)} />)
        )}
      </ScrollView>
    </View>
  );
}

function AlertCard({ alert: a, now = new Date(), onPress }: { alert: AlertItem; now?: Date; onPress: () => void }) {
  const o = a.occurrence;
  const title = alertTitle(a);
  const details = [o.breed, o.color].filter(Boolean).join(" · ") || speciesLabel(o.species);
  const distance = `~${formatApproxDistance(a.distanceMeters)}${a.sighting ? " de onde sumiu" : ""}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${distance.slice(1)}${a.seenAt ? "" : ", novo"}`}
      onPress={onPress}
      className="flex-row gap-3 rounded-3xl border border-border bg-card p-4 active:opacity-90"
      style={elevation.card}
    >
      <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl bg-muted">
        {o.photoUrl ? (
          <Image source={{ uri: o.photoUrl }} style={{ width: 72, height: 72 }} contentFit="cover" transition={200} />
        ) : (
          <SpeciesIcon species={o.species} size={26} color={colors.mutedForeground} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 font-nunito-black text-base text-foreground">
            {title}
          </Text>
          <StatusBadge type={o.type} />
        </View>
        <Text testID="alert-card-details" numberOfLines={1} className="font-sans text-xs text-muted-foreground">
          {details}
        </Text>
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <MapPin size={13} color={colors.primaryDeep} />
            <Text className="font-nunito-bold text-xs text-foreground">{distance}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Clock size={13} color={colors.mutedForeground} />
            <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(a.createdAt), now)}</Text>
          </View>
          {a.seenAt ? null : (
            <View className="rounded-full bg-accent px-2 py-0.5">
              <Text className="font-nunito-black text-xs text-white">Novo</Text>
            </View>
          )}
        </View>
        <Text testID="alert-card-address" numberOfLines={1} className="mt-1 font-sans text-xs text-muted-foreground">
          {o.approxAddress ?? MISSING_REGION}
        </Text>
      </View>
    </Pressable>
  );
}
