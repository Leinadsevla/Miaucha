import * as SecureStore from "expo-secure-store";

export const ONBOARDING_KEY = "miaucha.onboarding.v1";

type KeyValueStore = Pick<typeof SecureStore, "getItemAsync" | "setItemAsync">;

/** Lembra se o tutorial de boas-vindas já foi visto neste aparelho. */
export function createOnboardingStore(store: KeyValueStore = SecureStore) {
  return {
    /** Erro do armazenamento conta como visto: melhor pular o tutorial do que prender a pessoa nele. */
    async hasSeen(): Promise<boolean> {
      try {
        return (await store.getItemAsync(ONBOARDING_KEY)) === "1";
      } catch {
        return true;
      }
    },
    async markSeen(): Promise<void> {
      try {
        await store.setItemAsync(ONBOARDING_KEY, "1");
      } catch {
        // sem onde guardar: o tutorial pode aparecer de novo, o que não quebra nada
      }
    },
  };
}

export const onboardingStore = createOnboardingStore();

/** Mostrar o tutorial: a pessoa chegou ao app (destino "/") e ainda não o viu. `seen` null = carregando. */
export function shouldShowOnboarding(pathname: string, target: string, seen: boolean | null): boolean {
  return target === "/" && seen === false && pathname !== "/welcome";
}
