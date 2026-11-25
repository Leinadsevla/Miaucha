import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { LatLng } from "@miaucha/shared";
import type { GetLocation } from "@/features/location/currentLocation";
import type { AlertsClient } from "./alertsClient";
import type { GeofencingAvailability } from "./geofencing";
import { createLocationSync } from "./locationSync";
import { notificationTarget, pushAvailability, pushStatusMessage, registerForPush, type NotificationsApi, type PushEnvironment, type PushStatus } from "./push";

type NotificationResponseLike = { notification: { request: { content: { data: unknown } } } };

/** O que o app usa do expo-notifications (injetável nos testes). */
export type NotificationsRuntime = NotificationsApi & {
  setNotificationHandler(handler: {
    handleNotification: () => Promise<{ shouldShowBanner: boolean; shouldShowList: boolean; shouldPlaySound: boolean; shouldSetBadge: boolean }>;
  }): void;
  addNotificationResponseReceivedListener(listener: (response: NotificationResponseLike) => void): { remove(): void };
  getLastNotificationResponse(): NotificationResponseLike | null;
};

type NearbyLoader = (here: LatLng) => Promise<{ id: string; publicLocation: LatLng }[]>;

export type AlertsRuntimeDeps = {
  /** Posição só se a permissão já existe (nunca abre o diálogo). */
  getLocation: GetLocation;
  env: PushEnvironment;
  /** Carrega o expo-notifications só quando o push é possível (no Expo Go Android, nem importa). */
  loadNotifications: () => NotificationsRuntime;
  geofencing: GeofencingAvailability;
  startGeofencing: (here: LatLng, loader: NearbyLoader, options: { ask: boolean }) => Promise<boolean>;
  loadNearby: NearbyLoader;
};

type AlertsContextValue = {
  client: AlertsClient;
  /** Explicação do estado do push, ou null enquanto verifica. */
  pushStatus: string | null;
  pushToken: string | null;
  geofencing: GeofencingAvailability;
  /** Depois da explicação na tela de preferências: pede a permissão "sempre" e liga o geofencing. */
  enableGeofencing: () => Promise<boolean>;
};

const AlertsContext = createContext<AlertsContextValue | null>(null);

/** Confere a região de tempos em tempos com o app aberto (só envia se mudou de célula). */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Liga os alertas ao app enquanto há sessão com consentimento (`active`):
 * região aproximada (AL-06), registro do push, toque na notificação (AL-08) e geofencing opcional (AL-02).
 */
export function AlertsProvider({
  client,
  active,
  deps,
  onOpenOccurrence,
  onOpenConversation,
  children,
}: {
  client: AlertsClient;
  active: boolean;
  deps: AlertsRuntimeDeps;
  onOpenOccurrence: (occurrenceId: string) => void;
  /** Toque numa notificação de mensagem nova do chat. */
  onOpenConversation?: (conversationId: string) => void;
  children: ReactNode;
}) {
  const [push, setPush] = useState<PushStatus | null>(null);
  const openRef = useRef(onOpenOccurrence);
  openRef.current = onOpenOccurrence;
  const openConversationRef = useRef(onOpenConversation);
  openConversationRef.current = onOpenConversation;
  const depsRef = useRef(deps);
  depsRef.current = deps;

  const sync = useMemo(() => createLocationSync({ getLocation: deps.getLocation, send: (geohash) => client.updateLocation(geohash) }), [client, deps.getLocation]);

  // AL-06 (+ AL-03): região ao abrir, ao voltar para o primeiro plano e a cada 5 min.
  useEffect(() => {
    if (!active) return;
    const { geofencing, startGeofencing, loadNearby, getLocation } = depsRef.current;
    const run = async () => {
      await sync();
      if (geofencing === "enabled") {
        const here = await getLocation();
        if (here.status === "ok") await startGeofencing(here.coords, loadNearby, { ask: false }).catch(() => false);
      }
    };
    void run();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void run();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void run();
    }, SYNC_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [active, sync]);

  // Push: registro do token e toque na notificação.
  useEffect(() => {
    if (!active) return;
    const { env, loadNotifications } = depsRef.current;
    let cancelled = false;
    const availability = pushAvailability(env);
    // Sem push remoto aqui: nem carrega o módulo (o toque em notificação também não acontece).
    if (availability === "expo-go-android" || availability === "web") {
      setPush({ kind: "unavailable", reason: availability });
      return;
    }
    let notifications: NotificationsRuntime;
    try {
      notifications = loadNotifications();
    } catch {
      setPush({ kind: "error" });
      return;
    }
    notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const handle = (response: NotificationResponseLike | null) => {
      const target = notificationTarget(response?.notification.request.content.data);
      if (!target) return;
      if ("conversationId" in target) {
        openConversationRef.current?.(target.conversationId);
        return;
      }
      if (target.alertId) client.markSeen(target.alertId).catch(() => {});
      openRef.current(target.occurrenceId);
    };
    const subscription = notifications.addNotificationResponseReceivedListener(handle);
    handle(notifications.getLastNotificationResponse());
    void registerForPush({ env, notifications, register: (token) => client.registerPushToken(token) }).then((s) => !cancelled && setPush(s));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [active, client]);

  const enableGeofencing = useCallback(async () => {
    const { geofencing, getLocation, startGeofencing, loadNearby } = depsRef.current;
    if (geofencing !== "enabled") return false;
    const here = await getLocation();
    if (here.status !== "ok") return false;
    return startGeofencing(here.coords, loadNearby, { ask: true }).catch(() => false);
  }, []);

  const value = useMemo<AlertsContextValue>(
    () => ({
      client,
      pushStatus: push ? pushStatusMessage(push) : null,
      pushToken: push?.kind === "registered" ? push.token : null,
      geofencing: deps.geofencing,
      enableGeofencing,
    }),
    [client, push, deps.geofencing, enableGeofencing],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts(): AlertsContextValue {
  const value = useContext(AlertsContext);
  if (!value) throw new Error("useAlerts precisa estar dentro de <AlertsProvider>");
  return value;
}
