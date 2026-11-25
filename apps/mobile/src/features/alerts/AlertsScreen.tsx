import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { Image } from "expo-image";
import { Bell, BellRing, Clock, MapPin } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, speciesLabel, formatApproxDistance, formatTimeAgo, type AlertItem } from "@miaucha/shared";
import { PrimaryButton, SpeciesIcon, StatusBadge } from "@/components";
import type { AlertsClient } from "./alertsClient";

export type DistanceFilter = "all" | "under1" | "1to3" | "3to5";

const FILTERS: { key: DistanceFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "under1", label: "< 1 km" },
  { key: "1to3", label: "1–3 km" },
  { key: "3to5", label: "3–5 km" },
];

export function filterAlerts(alerts: AlertItem[], filter: DistanceFilter): AlertItem[] {
  const km = (a: AlertItem) => a.distanceMeters / 1000;
  switch (filter) {
    case "all":
      return alerts;
    case "under1":
      return alerts.filter((a) => km(a) < 1);
    case "1to3":
      return alerts.filter((a) => km(a) >= 1 && km(a) < 3);
    case "3to5":
      return alerts.filter((a) => km(a) >= 3);
  }
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
      <View className="border-b border-border bg-card px-5 pb-4" style={{ paddingTop: insets.top + 16 }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text accessibilityRole="header" className="font-nunito-black text-lg text-foreground">
              Alertas
            </Text>
            <Text className="font-sans text-xs text-muted-foreground">Pets desaparecidos próximos a você</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Preferências de alerta"
            onPress={onOpenPreferences}
            className="flex-row items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 active:opacity-80"
          >
            <Bell size={14} color={colors.primary} />
            <Text className="font-nunito-bold text-xs text-primary">Preferências</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3" contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityLabel={f.label}
              accessibilityState={{ selected: filter === f.key }}
              onPress={() => setFilter(f.key)}
              className={filter === f.key ? "rounded-xl bg-primary px-3 py-1.5" : "rounded-xl bg-muted px-3 py-1.5"}
            >
              <Text className={filter === f.key ? "font-nunito-bold text-xs text-white" : "font-nunito-bold text-xs text-muted-foreground"}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 96, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {pushNotice ? (
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
            <BellRing size={16} color={colors.accent} />
            <Text className="flex-1 font-sans text-xs text-muted-foreground">{pushNotice}</Text>
          </View>
        ) : null}

        {state.status === "loading" ? (
          <View className="items-center gap-3 py-10">
            <ActivityIndicator color={colors.primary} />
            <Text className="font-sans text-sm text-muted-foreground">Carregando alertas...</Text>
          </View>
        ) : state.status === "error" ? (
          <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5">
            <Text className="text-center font-sans text-sm text-lost">{state.message}</Text>
            <PrimaryButton title="Tentar de novo" variant="outline" onPress={() => void load("full")} />
          </View>
        ) : state.alerts.length === 0 ? (
          <View className="items-center gap-2 rounded-3xl border border-border bg-card p-5">
            <Text className="text-4xl">🐾</Text>
            <Text className="text-center font-sans text-sm text-muted-foreground">
              Nenhum alerta por enquanto. Quando um pet sumir dentro do seu raio, ele aparece aqui.
            </Text>
          </View>
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
  const details = [o.breed, o.color].filter(Boolean).join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatApproxDistance(a.distanceMeters)}${a.seenAt ? "" : ", novo"}`}
      onPress={onPress}
      className="flex-row gap-3 rounded-3xl border border-border bg-card p-4 active:opacity-90"
    >
      <View className="h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-muted">
        {o.photoUrl ? (
          <Image source={{ uri: o.photoUrl }} style={{ width: 64, height: 64 }} contentFit="cover" />
        ) : (
          <SpeciesIcon species={o.species} size={26} color={colors.mutedForeground} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between gap-2">
          <Text numberOfLines={1} className="flex-1 font-nunito-black text-sm text-foreground">
            {title}
          </Text>
          <StatusBadge type={o.type} />
        </View>
        {details ? <Text className="font-sans text-xs text-muted-foreground">{details}</Text> : null}
        <View className="mt-2 flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            <MapPin size={11} color={colors.primary} />
            <Text className="font-nunito-bold text-xs text-primary">~{formatApproxDistance(a.distanceMeters)}</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <Clock size={11} color={colors.mutedForeground} />
            <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(a.createdAt), now)}</Text>
          </View>
          {a.seenAt ? null : (
            <View className="rounded-full bg-lost px-2 py-0.5">
              <Text className="font-nunito-bold text-[10px] text-white">Novo</Text>
            </View>
          )}
        </View>
        {o.approxAddress ? (
          <Text numberOfLines={1} className="mt-1 font-sans text-xs text-muted-foreground">
            {o.approxAddress}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
