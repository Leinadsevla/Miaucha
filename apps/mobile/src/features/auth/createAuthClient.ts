import type { AuthClient } from "./AuthProvider";
import { createHttpAuthClient } from "./httpAuthClient";
import { createMockAuthClient } from "./mockAuthClient";
import { createSecureSessionStorage } from "./sessionStorage";

export function chooseAuthClient({ apiUrl, isDev }: { apiUrl: string | undefined; isDev: boolean }): "http" | "mock" {
  if (apiUrl?.trim()) return "http";
  if (isDev) return "mock";
  throw new Error("EXPO_PUBLIC_API_URL não definida: um build de produção não pode usar o login falso");
}

/** Cliente de autenticação do app. Sem `EXPO_PUBLIC_API_URL` em desenvolvimento, usa o login falso. */
export function createAuthClient(): AuthClient {
  // Acesso estático: o Expo só embute `EXPO_PUBLIC_*` escrito assim, com ponto.
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  return chooseAuthClient({ apiUrl, isDev: __DEV__ }) === "http"
    ? createHttpAuthClient({ baseUrl: apiUrl!, storage: createSecureSessionStorage() })
    : createMockAuthClient();
}
