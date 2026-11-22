import { act, render, screen } from "@testing-library/react-native";
import { AppState, Text } from "react-native";
import type { LocationResult } from "@/features/location/currentLocation";
import { AlertsProvider, useAlerts, type AlertsRuntimeDeps, type NotificationsRuntime } from "../AlertsProvider";
import { createMockAlertsClient, type AlertsClient } from "../alertsClient";

type Listener = (state: string) => void;

function setup(overrides: Partial<AlertsRuntimeDeps> = {}) {
  const appStateListeners: Listener[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_type, listener) => {
    appStateListeners.push(listener as Listener);
    return { remove: jest.fn() } as never;
  });
  let tap: ((r: { notification: { request: { content: { data: unknown } } } }) => void) | undefined;
  const notifications: NotificationsRuntime = {
    setNotificationChannelAsync: async () => null,
    getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    requestPermissionsAsync: async () => ({ granted: true, canAskAgain: true }),
    getExpoPushTokenAsync: async () => ({ type: "expo", data: "ExponentPushToken[abc]" }),
    setNotificationHandler: jest.fn(),
    addNotificationResponseReceivedListener: (listener) => {
      tap = listener as typeof tap;
      return { remove: jest.fn() };
    },
    getLastNotificationResponse: () => null,
  };
  const client = createMockAlertsClient() as AlertsClient;
  const updateLocation = jest.spyOn(client, "updateLocation");
  const registerPushToken = jest.spyOn(client, "registerPushToken");
  const markSeen = jest.spyOn(client, "markSeen").mockResolvedValue();
  const location: LocationResult = { status: "ok", coords: { lat: -23.5505, lng: -46.6333 } };
  const deps: AlertsRuntimeDeps = {
    getLocation: jest.fn(async () => location),
    env: { os: "android", isExpoGo: false, projectId: "p" },
    loadNotifications: () => notifications,
    geofencing: "flag-off",
    startGeofencing: jest.fn(async () => true),
    loadNearby: jest.fn(async () => []),
    ...overrides,
  };
  const onOpenOccurrence = jest.fn();
  return {
    client,
    deps,
    notifications,
    onOpenOccurrence,
    updateLocation,
    registerPushToken,
    markSeen,
    appStateListeners,
    tap: (data: unknown) => tap?.({ notification: { request: { content: { data } } } }),
  };
}

function PushStatus() {
  const { pushStatus } = useAlerts();
  return <Text>{pushStatus ?? "verificando"}</Text>;
}

afterEach(() => jest.restoreAllMocks());

describe("AlertsProvider", () => {
  it("com sessão: envia o geohash da região e registra o push", async () => {
    const s = setup();
    await render(
      <AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}>
        <PushStatus />
      </AlertsProvider>,
    );
    expect(await screen.findByText("Notificações ativas neste aparelho.")).toBeOnTheScreen();
    expect(s.updateLocation).toHaveBeenCalledWith("6gyf4b");
    expect(s.registerPushToken).toHaveBeenCalledWith("ExponentPushToken[abc]");
  });

  it("sem sessão (ou sem consentimento): não faz nada", async () => {
    const s = setup();
    await render(
      <AlertsProvider client={s.client} active={false} deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}>
        <PushStatus />
      </AlertsProvider>,
    );
    expect(screen.getByText("verificando")).toBeOnTheScreen();
    expect(s.deps.getLocation).not.toHaveBeenCalled();
    expect(s.registerPushToken).not.toHaveBeenCalled();
  });

  it("ao voltar para o primeiro plano, confere a região de novo", async () => {
    const s = setup();
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    await screen.findByText("Notificações ativas neste aparelho.");
    expect(s.deps.getLocation).toHaveBeenCalledTimes(1);
    await act(async () => s.appStateListeners.forEach((l) => l("active")));
    expect(s.deps.getLocation).toHaveBeenCalledTimes(2);
  });

  it("AL-08: tocar na notificação abre a ocorrência e marca o alerta como visto", async () => {
    const s = setup();
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    await screen.findByText("Notificações ativas neste aparelho.");
    await act(async () => s.tap({ occurrenceId: "o1", alertId: "a1" }));
    expect(s.onOpenOccurrence).toHaveBeenCalledWith("o1");
    expect(s.markSeen).toHaveBeenCalledWith("a1");
    await act(async () => s.tap({ outra: "coisa" }));
    expect(s.onOpenOccurrence).toHaveBeenCalledTimes(1);
  });

  it("app aberto pelo toque na notificação (estava fechado): abre a ocorrência", async () => {
    const s = setup();
    s.notifications.getLastNotificationResponse = () => ({ notification: { request: { content: { data: { occurrenceId: "o9" } } } } });
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    await screen.findByText("Notificações ativas neste aparelho.");
    expect(s.onOpenOccurrence).toHaveBeenCalledWith("o9");
  });

  it("Expo Go no Android: nem carrega o expo-notifications e explica o motivo", async () => {
    const loadNotifications = jest.fn();
    const s = setup({ env: { os: "android", isExpoGo: true, projectId: null }, loadNotifications });
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    expect(await screen.findByText(/Expo Go no Android não recebe notificações push/)).toBeOnTheScreen();
    expect(loadNotifications).not.toHaveBeenCalled();
    expect(s.updateLocation).toHaveBeenCalled();
  });

  it("geofencing ligado: remonta as regiões sem pedir permissão nova", async () => {
    const s = setup({ geofencing: "enabled" });
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    await screen.findByText("Notificações ativas neste aparelho.");
    expect(s.deps.startGeofencing).toHaveBeenCalledWith({ lat: -23.5505, lng: -46.6333 }, s.deps.loadNearby, { ask: false });
  });

  it("geofencing desligado (padrão): nunca chama a parte nativa", async () => {
    const s = setup();
    await render(<AlertsProvider client={s.client} active deps={s.deps} onOpenOccurrence={s.onOpenOccurrence}><PushStatus /></AlertsProvider>);
    await screen.findByText("Notificações ativas neste aparelho.");
    expect(s.deps.startGeofencing).not.toHaveBeenCalled();
  });
});
