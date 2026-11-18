import type { AuthClient } from "./AuthProvider";
import type { SessionUser } from "./session";
import type { SessionStorage, StoredSession } from "./sessionStorage";

/** Subconjunto do `fetch` usado aqui; injetável nos testes. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

/** Obtém o ID token do Google no aparelho (ex.: @react-native-google-signin). */
export type GoogleSignIn = { getIdToken(): Promise<string> };

type Options = { baseUrl: string; storage: SessionStorage; fetch?: FetchLike; google?: GoogleSignIn };

type ApiSession = { accessToken: string; refreshToken: string; user: SessionUser & { pseudonym?: string } };

const MESSAGES = {
  network: "Não foi possível falar com o servidor. Verifique sua conexão.",
  generic: "Algo deu errado. Tente de novo.",
  expired: "Sua sessão expirou. Entre de novo.",
  googleUnavailable: "O login com Google ainda não está disponível nesta versão do app",
};

/** Erro com o status HTTP (0 = sem rede) e a mensagem que a tela pode mostrar. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const googleUnavailable: GoogleSignIn = {
  getIdToken: () => Promise.reject(new Error(MESSAGES.googleUnavailable)),
};

function messageFrom(body: unknown): string | undefined {
  const b = body as { message?: unknown; errors?: Record<string, unknown> } | undefined;
  const firstFieldError = Object.values(b?.errors ?? {}).find((e) => typeof e === "string");
  if (typeof firstFieldError === "string") return firstFieldError;
  return typeof b?.message === "string" ? b.message : undefined;
}

function toStored(session: ApiSession): StoredSession {
  const { id, name, hasConsent } = session.user;
  return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: { id, name, hasConsent } };
}

export function createHttpAuthClient({ baseUrl, storage, fetch = globalThis.fetch, google = googleUnavailable }: Options): AuthClient {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T = unknown>(path: string, body?: unknown, accessToken?: string): Promise<T> {
    const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await fetch(`${root}${path}`, { method: "POST", headers, body: JSON.stringify(body ?? {}) });
    } catch {
      throw new ApiError(MESSAGES.network, 0);
    }
    const json = await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiError(messageFrom(json) ?? MESSAGES.generic, response.status);
    return json as T;
  }

  async function startSession(path: string, body: unknown): Promise<SessionUser> {
    const session = toStored(await request<ApiSession>(path, body));
    await storage.save(session);
    return session.user;
  }

  /**
   * Um refresh por vez: a API trata o reuso de um refresh token como roubo e derruba todas as sessões.
   * Devolve null quando a API recusa (sessão apagada); lança ApiError se não deu para falar com ela.
   */
  let refreshing: Promise<StoredSession | null> | undefined;

  function refreshSession(usedAccessToken?: string): Promise<StoredSession | null> {
    refreshing ??= (async () => {
      const current = await storage.load();
      if (!current) return null;
      // Outra chamada já renovou depois que esta recebeu o 401: só usa o token novo.
      if (usedAccessToken && current.accessToken !== usedAccessToken) return current;
      try {
        const session = toStored(await request<ApiSession>("/auth/refresh", { refreshToken: current.refreshToken }));
        await storage.save(session);
        return session;
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          await storage.clear();
          return null;
        }
        throw error;
      }
    })().finally(() => {
      refreshing = undefined;
    });
    return refreshing;
  }

  /** Chama uma rota autenticada; num 401, renova a sessão uma vez e repete. */
  async function authed(path: string, body?: unknown): Promise<StoredSession> {
    const session = await storage.load();
    if (!session) throw new Error(MESSAGES.expired);
    try {
      await request(path, body, session.accessToken);
      return session;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    const renewed = await refreshSession(session.accessToken);
    if (!renewed) throw new Error(MESSAGES.expired);
    await request(path, body, renewed.accessToken);
    return renewed;
  }

  return {
    async restore() {
      const saved = await storage.load();
      if (!saved) return null;
      try {
        return (await refreshSession())?.user ?? null;
      } catch {
        // Sem rede ou servidor fora do ar: abre com o usuário salvo; a próxima chamada autenticada renova.
        return saved.user;
      }
    },
    login: (input) => startSession("/auth/login", input),
    async signUp(input) {
      await request("/auth/signup", input);
    },
    verifyEmail: (email, code) => startSession("/auth/verify-email", { email, code }),
    async resendCode(email) {
      await request("/auth/resend-code", { email });
    },
    async loginWithGoogle() {
      const idToken = await google.getIdToken();
      return startSession("/auth/google", { idToken });
    },
    async saveConsent(consent) {
      await authed("/me/consent", consent);
      const latest = await storage.load();
      if (latest) await storage.save({ ...latest, user: { ...latest.user, hasConsent: true } });
    },
    async logout() {
      const saved = await storage.load();
      if (saved) await request("/auth/logout", { refreshToken: saved.refreshToken }).catch(() => undefined);
      await storage.clear();
    },
  };
}
