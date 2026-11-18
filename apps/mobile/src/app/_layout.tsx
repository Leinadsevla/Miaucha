import "../../global.css";
import { useEffect, useState } from "react";
import { Stack, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import { AuthProvider, createMockAuthClient, redirectTarget, routeFor, useAuth } from "@/features/auth";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_900Black });
  // TODO(S1): trocar pelo cliente HTTP quando apps/api tiver o módulo de auth.
  const [client] = useState(createMockAuthClient);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider client={client}>
        <StatusBar style="light" />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Mantém o usuário na tela certa para o estado da sessão (login → código → consentimento → app). */
function AuthGate() {
  const { state } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    const to = redirectTarget(pathname, routeFor(state));
    if (to) router.replace(to);
  }, [state, pathname]);

  return null;
}
