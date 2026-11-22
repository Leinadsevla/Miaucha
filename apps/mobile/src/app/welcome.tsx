import { router } from "expo-router";
import { OnboardingScreen, onboardingStore } from "@/features/onboarding";

/** Tutorial de boas-vindas (aberto pelo AuthGate no primeiro acesso ou pela Ajuda). */
export default function Welcome() {
  return (
    <OnboardingScreen
      onDone={() => {
        void onboardingStore.markSeen();
        if (router.canGoBack()) router.back();
        else router.replace("/");
      }}
    />
  );
}
