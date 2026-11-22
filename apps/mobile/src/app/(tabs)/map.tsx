import { useCallback, useRef, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getCurrentLocation } from "@/features/location";
import { MapScreen, mapCache } from "@/features/map";
import { openDirections, useOccurrencesClient } from "@/features/occurrences";

export default function MapTab() {
  const client = useOccurrencesClient();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const focusedBefore = useRef(false);

  // Ao voltar para a aba (ex.: depois de registrar ou resolver uma ocorrência), busca a mesma área de novo.
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setRefreshSignal((n) => n + 1);
      focusedBefore.current = true;
    }, []),
  );

  return (
    <MapScreen
      getLocation={getCurrentLocation}
      client={client}
      cache={mapCache}
      refreshSignal={refreshSignal}
      onOpen={(id) => router.push({ pathname: "/occurrences/[id]", params: { id } })}
      onDirections={(point) => openDirections(point, { platform: Platform.OS, alert: Alert.alert, openURL: Linking.openURL })}
      onOpenSettings={() => void Linking.openSettings()}
    />
  );
}
