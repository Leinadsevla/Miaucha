/**
 * Integração nativa do geofencing (AL-02 / AL-03). Só é carregado quando `geofencingAvailability(...)`
 * devolve "enabled" (development build + EXPO_PUBLIC_GEOFENCING=1); nunca no Expo Go.
 *
 * Para ligar de verdade (ver docs/PROXIMOS-PASSOS.md, S5):
 *  1. no app.json, plugin do expo-location com `locationAlwaysAndWhenInUsePermission` (texto),
 *     `isAndroidBackgroundLocationEnabled: true` e `isIosBackgroundLocationEnabled: true`;
 *  2. development build (`eas build --profile development`) e EXPO_PUBLIC_GEOFENCING=1;
 *  3. mostrar a explicação antes de pedir a permissão "sempre" (`startGeofencing` só a pede se ainda não houver).
 *
 * A lógica (quais regiões, quando recalcular, quando notificar) está em `geofencing.ts`, com testes;
 * este arquivo só liga as APIs nativas e não tem teste automatizado (teste de campo, ver a matriz).
 */
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as TaskManager from "expo-task-manager";
import type { LatLng } from "@miaucha/shared";
import { geofenceNotification, planGeofences, RECALC_REGION_ID } from "./geofencing";

export const GEOFENCING_TASK = "miaucha-geofencing";
const NOTIFIED_KEY = "miaucha.geofence.notified";
const MAX_NOTIFIED = 200;

type NearbyLoader = (here: LatLng) => Promise<{ id: string; publicLocation: LatLng }[]>;
let loadNearby: NearbyLoader | null = null;
let lastCenter: LatLng | null = null;

async function readNotified(): Promise<string[]> {
  try {
    const raw = await SecureStore.getItemAsync(NOTIFIED_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function recalculate(here: LatLng, force = false) {
  if (!loadNearby) return; // em segundo plano sem o app aberto: recalcula na próxima abertura
  const plan = planGeofences({
    occurrences: await loadNearby(here),
    here,
    lastCenter: force ? null : lastCenter,
    os: process.env.EXPO_OS === "ios" ? "ios" : "android",
  });
  if (!plan.recalculate) return;
  await Location.startGeofencingAsync(GEOFENCING_TASK, plan.regions);
  lastCenter = here;
}

type GeofenceEvent = { eventType: Location.LocationGeofencingEventType; region: { identifier?: string; latitude: number; longitude: number } };

// Precisa estar no escopo do módulo: o sistema pode abrir o app só para rodar a tarefa.
TaskManager.defineTask<GeofenceEvent>(GEOFENCING_TASK, async ({ data, error }) => {
  if (error || !data) return;
  const id = data.region.identifier ?? "";
  if (id === RECALC_REGION_ID && data.eventType === Location.LocationGeofencingEventType.Exit) {
    const last = await Location.getLastKnownPositionAsync();
    if (last) await recalculate({ lat: last.coords.latitude, lng: last.coords.longitude }, true);
    return;
  }
  if (data.eventType !== Location.LocationGeofencingEventType.Enter) return;
  const notified = await readNotified();
  const content = geofenceNotification(id, notified);
  if (!content) return;
  await Notifications.scheduleNotificationAsync({ content, trigger: null });
  await SecureStore.setItemAsync(NOTIFIED_KEY, JSON.stringify([...notified, id].slice(-MAX_NOTIFIED)));
});

/**
 * Chamado com o app aberto: guarda como buscar ocorrências e (re)monta as regiões.
 * Só pede a permissão "sempre" se a de primeiro plano já existir; se negada, não faz nada (AL-07: o alerta
 * pelo servidor continua funcionando).
 */
export async function startGeofencing(here: LatLng, loader: NearbyLoader, { ask }: { ask: boolean }): Promise<boolean> {
  loadNearby = loader;
  const foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) return false;
  let background = await Location.getBackgroundPermissionsAsync();
  // `ask: true` só depois da tela de explicação (preferências de alerta).
  if (ask && !background.granted && background.canAskAgain) background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) return false;
  await recalculate(here);
  return true;
}
