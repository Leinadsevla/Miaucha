import type { AuthClient } from "./AuthProvider";
import { createApiSession, toStoredSession, type ApiSession, type ApiSessionBody, type FetchLike } from "./apiSession";
import type { SessionUser } from "./session";
import type { SessionStorage } from "./sessionStorage";

export { ApiError, type FetchLike } from "./apiSession";

/** Obtém o ID token do Google no aparelho (ex.: @react-native-google-signin). */
export type GoogleSignIn = { getIdToken(): Promise<string> };

type Options = { baseUrl: string; storage: SessionStorage; fetch?: FetchLike; google?: GoogleSignIn; session?: ApiSession };

const googleUnavailable: GoogleSignIn = {
  getIdToken: () => Promise.reject(new Error("O login com Google ainda não está disponível nesta versão do app")),
};

export function createHttpAuthClient({ baseUrl, storage, fetch, google = googleUnavailable, session }: Options): AuthClient {
  const api = session ?? createApiSession({ baseUrl, storage, fetch });

  async function startSession(path: string, body: unknown): Promise<SessionUser> {
    const saved = toStoredSession(await api.request<ApiSessionBody>("POST", path, body));
    await storage.save(saved);
    return saved.user;
  }

  return {
    async restore() {
      const saved = await storage.load();
      if (!saved) return null;
      try {
        return (await api.refreshSession())?.user ?? null;
      } catch {
        // Sem rede ou servidor fora do ar: abre com o usuário salvo; a próxima chamada autenticada renova.
        return saved.user;
      }
    },
    login: (input) => startSession("/auth/login", input),
    async signUp(input) {
      await api.request("POST", "/auth/signup", input);
    },
    verifyEmail: (email, code) => startSession("/auth/verify-email", { email, code }),
    async requestPasswordReset(email) {
      await api.request("POST", "/auth/forgot-password", { email });
    },
    resetPassword: (email, code, password) => startSession("/auth/reset-password", { email, code, password }),
    async resendCode(email) {
      await api.request("POST", "/auth/resend-code", { email });
    },
    async loginWithGoogle() {
      const idToken = await google.getIdToken();
      return startSession("/auth/google", { idToken });
    },
    async saveConsent(consent) {
      await api.authed("POST", "/me/consent", consent);
      const latest = await storage.load();
      if (latest) await storage.save({ ...latest, user: { ...latest.user, hasConsent: true } });
    },
    onSessionExpired: (listener) => api.onExpired(listener),
    async logout() {
      const saved = await storage.load();
      if (saved) await api.request("POST", "/auth/logout", { refreshToken: saved.refreshToken }).catch(() => undefined);
      await storage.clear();
    },
  };
}
