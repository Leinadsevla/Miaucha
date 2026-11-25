import { useCallback, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { AlertsScreen, useAlerts } from "@/features/alerts";

export default function AlertsTab() {
  const { client, pushStatus, pushToken } = useAlerts();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const focusedBefore = useRef(false);

  // Ao voltar para a aba, recarrega sem "carregando".
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setRefreshSignal((n) => n + 1);
      focusedBefore.current = true;
    }, []),
  );

  return (
    <AlertsScreen
      client={client}
      refreshSignal={refreshSignal}
      pushNotice={pushToken ? null : pushStatus}
      onOpen={(id) => router.push({ pathname: "/occurrences/[id]", params: { id } })}
      onOpenPreferences={() => router.push("/alert-preferences")}
    />
  );
}
