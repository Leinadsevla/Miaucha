import { createHttpAlertsClient, createMockAlertsClient, type AlertsClient } from "@/features/alerts/alertsClient";
import { createHttpOccurrencesClient, createMockOccurrencesClient, type OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import { createFileUploader } from "@/features/pets/fileUploader";
import { createHttpPetsClient, createMockPetsClient, type PetsClient } from "@/features/pets/petsClient";
import { createHttpProfileClient, createMockProfileClient, type ProfileClient } from "@/features/profile/profileClient";
import type { AuthClient } from "./AuthProvider";
import { createApiSession } from "./apiSession";
import { createHttpAuthClient } from "./httpAuthClient";
import { createMockAuthClient } from "./mockAuthClient";
import { createSecureSessionStorage } from "./sessionStorage";

export function chooseAuthClient({ apiUrl, isDev }: { apiUrl: string | undefined; isDev: boolean }): "http" | "mock" {
  if (apiUrl?.trim()) return "http";
  if (isDev) return "mock";
  throw new Error("EXPO_PUBLIC_API_URL não definida: um build de produção não pode usar o login falso");
}

export type AppClients = { auth: AuthClient; pets: PetsClient; occurrences: OccurrencesClient; alerts: AlertsClient; profile: ProfileClient };

/**
 * Clientes da API do app. Todos usam a mesma sessão, para existir um único refresh por vez.
 * Sem `EXPO_PUBLIC_API_URL` em desenvolvimento, usa clientes falsos em memória.
 */
export function createClients(): AppClients {
  // Acesso estático: o Expo só embute `EXPO_PUBLIC_*` escrito assim, com ponto.
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (chooseAuthClient({ apiUrl, isDev: __DEV__ }) === "mock") {
    const pets = createMockPetsClient();
    const occurrences = createMockOccurrencesClient();
    return {
      auth: createMockAuthClient(),
      pets,
      occurrences,
      alerts: createMockAlertsClient(),
      profile: createMockProfileClient({ pets, occurrences }),
    };
  }
  const storage = createSecureSessionStorage();
  const session = createApiSession({ baseUrl: apiUrl!, storage });
  const upload = createFileUploader();
  return {
    auth: createHttpAuthClient({ baseUrl: apiUrl!, storage, session }),
    pets: createHttpPetsClient({ session, upload }),
    occurrences: createHttpOccurrencesClient({ session, upload }),
    alerts: createHttpAlertsClient({ session }),
    profile: createHttpProfileClient({ session }),
  };
}
