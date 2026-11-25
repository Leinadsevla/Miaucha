import { useCallback, useRef, useState } from "react";
import { Linking } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "@/features/auth";
import { getCurrentLocation } from "@/features/location";
import { HomeScreen, useOccurrencesClient } from "@/features/occurrences";

export default function Home() {
  const { state } = useAuth();
  const client = useOccurrencesClient();
  const [refreshSignal, setRefreshSignal] = useState(0);
  const focusedBefore = useRef(false);

  // Ao voltar para a aba (ex.: depois de registrar uma ocorrência), recarrega sem "carregando".
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setRefreshSignal((n) => n + 1);
      focusedBefore.current = true;
    }, []),
  );

  return (
    <HomeScreen
      userName={state.status === "signedIn" ? state.user.name : ""}
      getLocation={getCurrentLocation}
      client={client}
      refreshSignal={refreshSignal}
      onOpen={(id) => router.push({ pathname: "/occurrences/[id]", params: { id } })}
      onRegister={() => router.push("/occurrences/new")}
      onOpenSettings={() => void Linking.openSettings()}
      onOpenMap={() => router.push("/map")}
    />
  );
}
