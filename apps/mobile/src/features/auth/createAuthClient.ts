import { Platform } from "react-native";
import { createHttpAlertsClient, createMockAlertsClient, type AlertsClient } from "@/features/alerts/alertsClient";
import { createHttpChatClient, createMockChatClient, type ChatClient } from "@/features/chat/chatClient";
import { createChatRealtime, createLocalChatRealtime, type ChatRealtime } from "@/features/chat/chatRealtime";
import { socketIoFactory } from "@/features/chat/socketFactory";
import { createHttpOccurrencesClient, createMockOccurrencesClient, type OccurrencesClient } from "@/features/occurrences/occurrencesClient";
import { createFileUploader } from "@/features/pets/fileUploader";
import { createHttpPetsClient, createMockPetsClient, type PetsClient } from "@/features/pets/petsClient";
import { createHttpProfileClient, createMockProfileClient, type ProfileClient } from "@/features/profile/profileClient";
import type { AuthClient } from "./AuthProvider";
import { createApiSession } from "./apiSession";
import { createBrowserGoogleSignIn } from "./googleWeb";
import { createHttpAuthClient, type GoogleSignIn } from "./httpAuthClient";
import { createMockAuthClient } from "./mockAuthClient";
import { createSecureSessionStorage } from "./sessionStorage";

/**
 * Modo demonstração (`EXPO_PUBLIC_DEMO=1`): o app inteiro com dados de exemplo, sem API, para apresentar.
 * Vale até num build de produção, porque é ligado de propósito. Leia como `process.env.EXPO_PUBLIC_DEMO`.
 */
export const DEMO_MODE = process.env.EXPO_PUBLIC_DEMO === "1";

export function chooseAuthClient({ apiUrl, isDev, demo = false }: { apiUrl: string | undefined; isDev: boolean; demo?: boolean }): "http" | "mock" {
  if (demo) return "mock";
  if (apiUrl?.trim()) return "http";
  if (isDev) return "mock";
  throw new Error("EXPO_PUBLIC_API_URL não definida: um build de produção não pode usar o login falso");
}

/**
 * No navegador a API precisa liberar a origem do app por CORS (`CORS_ORIGINS` na API). A de produção
 * pode não liberar o `localhost`; por isso a web aceita um endereço próprio, sem mexer no do aparelho.
 */
export function chooseApiUrl({ os, apiUrl, webApiUrl }: { os: string; apiUrl: string | undefined; webApiUrl: string | undefined }): string | undefined {
  return os === "web" && webApiUrl?.trim() ? webApiUrl.trim() : apiUrl;
}

/**
 * Login com Google de verdade. Na web, com `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (Client ID do tipo
 * "Aplicativo da Web", que também precisa estar em `GOOGLE_CLIENT_IDS` na API). No aparelho ainda falta
 * o login nativo (`@react-native-google-signin`, com development build): lá fica indisponível.
 */
export function googleSignInFor({
  os,
  webClientId,
  create = createBrowserGoogleSignIn,
}: {
  os: string;
  webClientId: string | undefined;
  create?: (clientId: string) => GoogleSignIn;
}): GoogleSignIn | undefined {
  const clientId = webClientId?.trim();
  return os === "web" && clientId ? create(clientId) : undefined;
}

export type AppClients = {
  auth: AuthClient;
  pets: PetsClient;
  occurrences: OccurrencesClient;
  alerts: AlertsClient;
  profile: ProfileClient;
  chat: ChatClient;
  chatRealtime: ChatRealtime;
  /** Clientes falsos em memória (dados de exemplo): a tela mostra o aviso de demonstração. */
  demo: boolean;
  /** O botão do Google entra na demonstração (não há login real com Google configurado). */
  googleIsDemo?: boolean;
};

/** Clientes falsos em memória, com dados de exemplo: nada vai para a API. */
export function createMockClients(): AppClients {
  const pets = createMockPetsClient();
  const occurrences = createMockOccurrencesClient();
  return {
    auth: createMockAuthClient(),
    pets,
    occurrences,
    alerts: createMockAlertsClient(),
    profile: createMockProfileClient({ pets, occurrences }),
    chat: createMockChatClient(),
    chatRealtime: createLocalChatRealtime(),
    demo: true,
  };
}

/**
 * Sem login real com Google configurado, em desenvolvimento, o botão "Continuar com Google" entra numa
 * sessão de demonstração (Tutor Google, dados de exemplo), como antes de existir a API. `swap` troca
 * os clientes do app inteiro (que remonta e restaura a sessão); sair da demonstração devolve os reais.
 * Num build de produção isso nunca acontece: sem Google configurado, o botão fica escondido.
 */
export function withDemoGoogle(real: AppClients, { isDev, swap }: { isDev: boolean; swap: (clients: AppClients) => void }): AppClients {
  if (!isDev || real.demo || real.auth.supportsGoogle) return real;
  const wrapped: AppClients = {
    ...real,
    googleIsDemo: true,
    auth: {
      ...real.auth,
      supportsGoogle: true,
      async loginWithGoogle() {
        const demo = createMockClients();
        const user = await demo.auth.loginWithGoogle();
        const leave = demo.auth.logout;
        swap({
          ...demo,
          auth: {
            ...demo.auth,
            async logout() {
              await leave();
              swap(wrapped);
            },
          },
        });
        return user;
      },
    },
  };
  return wrapped;
}

/**
 * Clientes da API do app. Todos usam a mesma sessão, para existir um único refresh por vez.
 * Sem `EXPO_PUBLIC_API_URL` em desenvolvimento, usa clientes falsos em memória.
 */
export function createClients(): AppClients {
  // Acesso estático: o Expo só embute `EXPO_PUBLIC_*` escrito assim, com ponto.
  const apiUrl = chooseApiUrl({
    os: Platform.OS,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    webApiUrl: process.env.EXPO_PUBLIC_WEB_API_URL,
  });
  if (chooseAuthClient({ apiUrl, isDev: __DEV__, demo: DEMO_MODE }) === "mock") return createMockClients();
  const storage = createSecureSessionStorage();
  const session = createApiSession({ baseUrl: apiUrl!, storage });
  const upload = createFileUploader();
  return {
    auth: createHttpAuthClient({
      baseUrl: apiUrl!,
      storage,
      session,
      google: googleSignInFor({ os: Platform.OS, webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID }),
    }),
    pets: createHttpPetsClient({ session, upload }),
    occurrences: createHttpOccurrencesClient({ session, upload }),
    alerts: createHttpAlertsClient({ session }),
    profile: createHttpProfileClient({ session }),
    chat: createHttpChatClient({ session, upload }),
    chatRealtime: createChatRealtime({ url: apiUrl!, session, connect: socketIoFactory }),
    demo: false,
  };
}
