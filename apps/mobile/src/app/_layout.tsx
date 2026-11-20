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
import { AuthProvider, createClients, redirectTarget, routeFor, useAuth } from "@/features/auth";
import { PetsClientProvider } from "@/features/pets";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_900Black });
  // API real quando EXPO_PUBLIC_API_URL existe (ver apps/mobile/.env.example); senão, clientes falsos em dev.
  const [clients] = useState(createClients);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <AuthProvider client={clients.auth}>
        <PetsClientProvider client={clients.pets}>
          <StatusBar style="light" />
          <AuthGate />
          <Stack screenOptions={{ headerShown: false }} />
        </PetsClientProvider>
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
