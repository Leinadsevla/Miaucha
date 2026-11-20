import type { SessionUser } from "./session";
import type { SessionStorage, StoredSession } from "./sessionStorage";

/** Subconjunto do `fetch` usado aqui; injetável nos testes. */
export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string },
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

export const API_MESSAGES = {
  network: "Não foi possível falar com o servidor. Verifique sua conexão.",
  generic: "Algo deu errado. Tente de novo.",
  expired: "Sua sessão expirou. Entre de novo.",
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

/** Sessão como a API devolve no login, verificação, Google e refresh. */
export type ApiSessionBody = { accessToken: string; refreshToken: string; user: SessionUser & { pseudonym?: string } };

type Method = "GET" | "POST";

function messageFrom(body: unknown): string | undefined {
  const b = body as { message?: unknown; errors?: Record<string, unknown> } | undefined;
  const firstFieldError = Object.values(b?.errors ?? {}).find((e) => typeof e === "string");
  if (typeof firstFieldError === "string") return firstFieldError;
  return typeof b?.message === "string" ? b.message : undefined;
}

export function toStoredSession(session: ApiSessionBody): StoredSession {
  const { id, name, hasConsent } = session.user;
  return { accessToken: session.accessToken, refreshToken: session.refreshToken, user: { id, name, hasConsent } };
}

export type ApiSession = ReturnType<typeof createApiSession>;

/**
 * Chamadas à API com a sessão salva: autentica, renova num 401 e garante um único refresh por vez
 * (a API trata o reuso de um refresh token como roubo e derruba todas as sessões).
 */
export function createApiSession({ baseUrl, storage, fetch = globalThis.fetch }: { baseUrl: string; storage: SessionStorage; fetch?: FetchLike }) {
  const root = baseUrl.replace(/\/+$/, "");

  async function request<T = unknown>(method: Method, path: string, body?: unknown, accessToken?: string): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (method !== "GET") headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response: Awaited<ReturnType<FetchLike>>;
    try {
      response = await fetch(`${root}${path}`, { method, headers, body: method === "GET" ? undefined : JSON.stringify(body ?? {}) });
    } catch {
      throw new ApiError(API_MESSAGES.network, 0);
    }
    const json = await response.json().catch(() => undefined);
    if (!response.ok) throw new ApiError(messageFrom(json) ?? API_MESSAGES.generic, response.status);
    return json as T;
  }

  let refreshing: Promise<StoredSession | null> | undefined;

  /** Devolve null quando a API recusa (sessão apagada); lança ApiError se não deu para falar com ela. */
  function refreshSession(usedAccessToken?: string): Promise<StoredSession | null> {
    refreshing ??= (async () => {
      const current = await storage.load();
      if (!current) return null;
      // Outra chamada já renovou depois que esta recebeu o 401: só usa o token novo.
      if (usedAccessToken && current.accessToken !== usedAccessToken) return current;
      try {
        const session = toStoredSession(
          await request<ApiSessionBody>("POST", "/auth/refresh", { refreshToken: current.refreshToken }),
        );
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
  async function authed<T = unknown>(method: Method, path: string, body?: unknown): Promise<T> {
    const session = await storage.load();
    if (!session) throw new Error(API_MESSAGES.expired);
    try {
      return await request<T>(method, path, body, session.accessToken);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    const renewed = await refreshSession(session.accessToken);
    if (!renewed) throw new Error(API_MESSAGES.expired);
    return request<T>(method, path, body, renewed.accessToken);
  }

  return { request, authed, refreshSession, storage };
}
