import "../../global.css";
import "@/lib/webStyles";
import { useEffect, useState, type ReactNode } from "react";
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
import { AlertsProvider } from "@/features/alerts";
import { createAlertsRuntimeDeps } from "@/features/alerts/runtime";
import { AuthProvider, createClients, redirectTarget, routeFor, useAuth, type AppClients } from "@/features/auth";
import { SessionChatProvider } from "@/features/chat";
import { OccurrencesClientProvider } from "@/features/occurrences";
import { onboardingStore, shouldShowOnboarding } from "@/features/onboarding";
import { PetsClientProvider } from "@/features/pets";
import { statusBarStyleFor } from "@/lib/statusBar";
import { ProfileClientProvider } from "@/features/profile";

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
          <OccurrencesClientProvider client={clients.occurrences}>
            <ProfileClientProvider client={clients.profile}>
              <AlertsLayer clients={clients}>
                <SessionChatProvider client={clients.chat} realtime={clients.chatRealtime}>
                  <RouteStatusBar />
                  <AuthGate />
                  <Stack screenOptions={{ headerShown: false }} />
                </SessionChatProvider>
              </AlertsLayer>
            </ProfileClientProvider>
          </OccurrencesClientProvider>
        </PetsClientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/** Ícones da barra de status claros sobre laranja ou foto, escuros sobre telas brancas. */
function RouteStatusBar() {
  return <StatusBar style={statusBarStyleFor(usePathname())} />;
}

/** Mantém o usuário na tela certa para o estado da sessão (login → código → consentimento → app). */
function AuthGate() {
  const { state } = useAuth();
  const pathname = usePathname();
  // Tutorial de boas-vindas: null enquanto lê do aparelho; mostrado uma vez ao chegar no app.
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    void onboardingStore.hasSeen().then(setSeenOnboarding);
  }, []);

  useEffect(() => {
    const target = routeFor(state);
    const to = redirectTarget(pathname, target);
    if (to) router.replace(to);
    else if (shouldShowOnboarding(pathname, target, seenOnboarding)) {
      setSeenOnboarding(true);
      router.push("/welcome");
    }
  }, [state, pathname, seenOnboarding]);

  return null;
}

/** Alertas (S5) só com sessão e consentimento: região aproximada, push e toque na notificação (AL-08). */
function AlertsLayer({ clients, children }: { clients: AppClients; children: ReactNode }) {
  const { state } = useAuth();
  const [deps] = useState(() => createAlertsRuntimeDeps(clients.occurrences, clients.alerts));
  return (
    <AlertsProvider
      client={clients.alerts}
      active={state.status === "signedIn" && state.user.hasConsent}
      deps={deps}
      onOpenOccurrence={(id) => router.push({ pathname: "/occurrences/[id]", params: { id } })}
      onOpenConversation={(id) => router.push({ pathname: "/chat/[id]", params: { id } })}
    >
      {children}
    </AlertsProvider>
  );
}
