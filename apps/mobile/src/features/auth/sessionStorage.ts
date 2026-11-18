import * as SecureStore from "expo-secure-store";
import type { SessionUser } from "./session";

/** O que o app guarda entre aberturas: tokens da API e o usuário (para abrir offline). */
export type StoredSession = { accessToken: string; refreshToken: string; user: SessionUser };

export type SessionStorage = {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
};

/** Subconjunto do expo-secure-store usado aqui; injetável nos testes. */
export type KeyValueStore = Pick<typeof SecureStore, "getItemAsync" | "setItemAsync" | "deleteItemAsync">;

export const SESSION_KEY = "miaucha.session";

function isStoredSession(value: unknown): value is StoredSession {
  const v = value as StoredSession | null;
  return (
    typeof v?.accessToken === "string" &&
    typeof v.refreshToken === "string" &&
    typeof v.user?.id === "string" &&
    typeof v.user.name === "string" &&
    typeof v.user.hasConsent === "boolean"
  );
}

/** Keychain no iOS e Keystore no Android; nada de token em AsyncStorage. */
export function createSecureSessionStorage(store: KeyValueStore = SecureStore): SessionStorage {
  return {
    async load() {
      try {
        const raw = await store.getItemAsync(SESSION_KEY);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        return isStoredSession(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save: (session) => store.setItemAsync(SESSION_KEY, JSON.stringify(session)),
    clear: () => store.deleteItemAsync(SESSION_KEY),
  };
}
