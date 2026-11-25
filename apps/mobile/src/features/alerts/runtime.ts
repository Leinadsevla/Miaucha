import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import { getLocationIfAllowed } from "@/features/location/currentLocation";
import type { OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import type { AlertsRuntimeDeps, NotificationsRuntime } from "./AlertsProvider";
import { geofencingAvailability } from "./geofencing";
import type { PushEnvironment } from "./push";

/** Liga as peças testadas às APIs reais do Expo. Sem lógica própria. */
const isExpoGo = isRunningInExpoGo();

const pushEnv: PushEnvironment = {
  os: Platform.OS,
  isExpoGo,
  projectId:
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId ?? null,
};

// Acesso estático: o Expo só embute `EXPO_PUBLIC_*` escrito assim.
const geofencing = geofencingAvailability({ os: Platform.OS, isExpoGo, flag: process.env.EXPO_PUBLIC_GEOFENCING });

// A tarefa do geofencing precisa ser definida na carga do app (o sistema pode abrir o app só para rodá-la).
// No Expo Go e sem a flag, o módulo nativo nem é carregado.
if (geofencing === "enabled") require("./geofencingNative");

export function createAlertsRuntimeDeps(occurrences: OccurrencesClient): AlertsRuntimeDeps {
  return {
    getLocation: getLocationIfAllowed,
    env: pushEnv,
    // `require` em vez de import: no Expo Go Android o expo-notifications nem é avaliado.
    loadNotifications: () => require("expo-notifications") as NotificationsRuntime,
    geofencing,
    startGeofencing: (here, loader, options) =>
      (require("./geofencingNative") as typeof import("./geofencingNative")).startGeofencing(here, loader, options),
    loadNearby: (here) => occurrences.nearby({ ...here, radiusKm: 5 }),
  };
}
