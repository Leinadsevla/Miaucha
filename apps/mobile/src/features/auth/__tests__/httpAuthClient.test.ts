import { createHttpAuthClient, type FetchLike } from "../httpAuthClient";
import type { SessionStorage, StoredSession } from "../sessionStorage";

type Call = { method: string; path: string; body: unknown; authorization?: string };
type Reply = { status: number; body?: unknown } | "network-error";
type Handler = (call: Call) => Reply | Promise<Reply>;

/** API falsa: cada rota responde pelo handler; registra todas as chamadas. */
function fakeApi(routes: Record<string, Handler>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const path = url.replace("https://api.teste", "");
    const headers = (init.headers ?? {}) as Record<string, string>;
    const call: Call = {
      method: init.method ?? "GET",
      path,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
      authorization: headers.Authorization,
    };
    calls.push(call);
    const handler = routes[`${call.method} ${path}`];
    if (!handler) throw new Error(`rota não esperada: ${call.method} ${path}`);
    const reply = await handler(call);
    if (reply === "network-error") throw new TypeError("Network request failed");
    return { ok: reply.status >= 200 && reply.status < 300, status: reply.status, json: async () => reply.body };
  };
  return { fetch, calls, count: (route: string) => calls.filter((c) => `${c.method} ${c.path}` === route).length };
}

function memoryStorage(initial: StoredSession | null = null): SessionStorage & { current: StoredSession | null } {
  const s = {
    current: initial,
    load: async () => s.current,
    save: async (session: StoredSession) => {
      s.current = session;
    },
    clear: async () => {
      s.current = null;
    },
  };
  return s;
}

const apiUser = { id: "u1", name: "Ana", pseudonym: "Tutor Azul 10", hasConsent: false };
const sessionReply = (n = 1) => ({
  status: 200,
  body: { accessToken: `access-${n}`, refreshToken: `refresh-${n}`, user: apiUser },
});
const stored: StoredSession = {
  accessToken: "access-0",
  refreshToken: "refresh-0",
  user: { id: "u1", name: "Ana", hasConsent: false },
};

function setup(routes: Record<string, Handler>, initial: StoredSession | null = null) {
  const api = fakeApi(routes);
  const storage = memoryStorage(initial);
  const client = createHttpAuthClient({ baseUrl: "https://api.teste/", storage, fetch: api.fetch });
  return { api, storage, client };
}

describe("createHttpAuthClient", () => {
  describe("login", () => {
    it("envia e-mail e senha, salva a sessão e devolve o usuário no formato do app", async () => {
      const { api, storage, client } = setup({ "POST /auth/login": () => sessionReply() });

      const user = await client.login({ email: "ana@exemplo.com", password: "senha1234" });

      expect(user).toEqual({ id: "u1", name: "Ana", hasConsent: false });
      expect(api.calls[0].body).toEqual({ email: "ana@exemplo.com", password: "senha1234" });
      expect(storage.current).toEqual({ accessToken: "access-1", refreshToken: "refresh-1", user });
    });

    it("erro da API vira Error com a mensagem dela, para a tela mostrar", async () => {
      const { client, storage } = setup({
        "POST /auth/login": () => ({ status: 401, body: { message: "E-mail ou senha incorretos" } }),
      });
      await expect(client.login({ email: "a@b.com", password: "x" })).rejects.toThrow("E-mail ou senha incorretos");
      expect(storage.current).toBeNull();
    });

    it("400 com erros por campo mostra o primeiro erro", async () => {
      const { client } = setup({
        "POST /auth/login": () => ({
          status: 400,
          body: { message: "Confira os dados informados", errors: { email: "E-mail inválido" } },
        }),
      });
      await expect(client.login({ email: "x", password: "y" })).rejects.toThrow("E-mail inválido");
    });

    it("sem rede → mensagem de conexão", async () => {
      const { client } = setup({ "POST /auth/login": () => "network-error" });
      await expect(client.login({ email: "a@b.com", password: "x" })).rejects.toThrow(
        "Não foi possível falar com o servidor. Verifique sua conexão.",
      );
    });

    it("resposta sem JSON (ex.: 502 do proxy) → mensagem genérica", async () => {
      const { client } = setup({ "POST /auth/login": () => ({ status: 502 }) });
      await expect(client.login({ email: "a@b.com", password: "x" })).rejects.toThrow("Algo deu errado. Tente de novo.");
    });
  });

  describe("cadastro e código", () => {
    it("signUp e resendCode só chamam a API, sem criar sessão", async () => {
      const { api, storage, client } = setup({
        "POST /auth/signup": () => ({ status: 201 }),
        "POST /auth/resend-code": () => ({ status: 204 }),
      });
      await client.signUp({ name: "Ana", email: "ana@exemplo.com", password: "senha1234" });
      await client.resendCode("ana@exemplo.com");

      expect(api.calls.map((c) => c.body)).toEqual([
        { name: "Ana", email: "ana@exemplo.com", password: "senha1234" },
        { email: "ana@exemplo.com" },
      ]);
      expect(storage.current).toBeNull();
    });

    it("verifyEmail salva a sessão", async () => {
      const { api, storage, client } = setup({ "POST /auth/verify-email": () => sessionReply() });
      const user = await client.verifyEmail("ana@exemplo.com", "123456");
      expect(api.calls[0].body).toEqual({ email: "ana@exemplo.com", code: "123456" });
      expect(user.id).toBe("u1");
      expect(storage.current?.refreshToken).toBe("refresh-1");
    });
  });

  describe("loginWithGoogle", () => {
    it("troca o ID token do Google por uma sessão", async () => {
      const api = fakeApi({ "POST /auth/google": () => sessionReply() });
      const storage = memoryStorage();
      const client = createHttpAuthClient({
        baseUrl: "https://api.teste",
        storage,
        fetch: api.fetch,
        google: { getIdToken: async () => "id-token-google" },
      });

      await client.loginWithGoogle();

      expect(api.calls[0].body).toEqual({ idToken: "id-token-google" });
      expect(storage.current?.accessToken).toBe("access-1");
    });

    it("sem o módulo nativo configurado, explica que ainda não está disponível", async () => {
      const { client, api } = setup({});
      await expect(client.loginWithGoogle()).rejects.toThrow("O login com Google ainda não está disponível nesta versão do app");
      expect(api.calls).toHaveLength(0);
    });
  });

  describe("restore", () => {
    it("sem sessão salva → null, sem chamar a API", async () => {
      const { client, api } = setup({});
      expect(await client.restore()).toBeNull();
      expect(api.calls).toHaveLength(0);
    });

    it("com sessão salva → renova os tokens e devolve o usuário atualizado", async () => {
      const { client, api, storage } = setup(
        { "POST /auth/refresh": () => ({ ...sessionReply(), body: { ...sessionReply().body, user: { ...apiUser, hasConsent: true } } }) },
        stored,
      );
      expect(await client.restore()).toEqual({ id: "u1", name: "Ana", hasConsent: true });
      expect(api.calls[0].body).toEqual({ refreshToken: "refresh-0" });
      expect(storage.current?.refreshToken).toBe("refresh-1");
    });

    it("refresh recusado (401) → apaga a sessão e devolve null", async () => {
      const { client, storage } = setup({ "POST /auth/refresh": () => ({ status: 401, body: { message: "Sessão expirada" } }) }, stored);
      expect(await client.restore()).toBeNull();
      expect(storage.current).toBeNull();
    });

    it("sem rede → abre com o usuário salvo (o app funciona offline)", async () => {
      const { client, storage } = setup({ "POST /auth/refresh": () => "network-error" }, stored);
      expect(await client.restore()).toEqual(stored.user);
      expect(storage.current).toEqual(stored);
    });

    it("servidor fora do ar (5xx) → também mantém a sessão salva", async () => {
      const { client, storage } = setup({ "POST /auth/refresh": () => ({ status: 503 }) }, stored);
      expect(await client.restore()).toEqual(stored.user);
      expect(storage.current).toEqual(stored);
    });
  });

  describe("saveConsent (rota autenticada)", () => {
    const consent = { privacyPolicy: true, approximateLocation: true };

    it("envia o access token e marca o consentimento na sessão salva", async () => {
      const { client, api, storage } = setup({ "POST /me/consent": () => ({ status: 204 }) }, stored);
      await client.saveConsent(consent);
      expect(api.calls[0]).toMatchObject({ authorization: "Bearer access-0", body: consent });
      expect(storage.current?.user.hasConsent).toBe(true);
    });

    it("access token vencido (401) → renova uma vez e repete a chamada", async () => {
      const { client, api } = setup(
        {
          "POST /me/consent": (call) => (call.authorization === "Bearer access-1" ? { status: 204 } : { status: 401 }),
          "POST /auth/refresh": () => sessionReply(),
        },
        stored,
      );
      await client.saveConsent(consent);
      expect(api.calls.map((c) => `${c.method} ${c.path}`)).toEqual(["POST /me/consent", "POST /auth/refresh", "POST /me/consent"]);
    });

    it("refresh também recusado → apaga a sessão e pede para entrar de novo", async () => {
      const { client, storage } = setup(
        { "POST /me/consent": () => ({ status: 401 }), "POST /auth/refresh": () => ({ status: 401 }) },
        stored,
      );
      await expect(client.saveConsent(consent)).rejects.toThrow("Sua sessão expirou. Entre de novo.");
      expect(storage.current).toBeNull();
    });

    it("sem sessão salva → pede para entrar de novo, sem chamar a API", async () => {
      const { client, api } = setup({});
      await expect(client.saveConsent(consent)).rejects.toThrow("Sua sessão expirou. Entre de novo.");
      expect(api.calls).toHaveLength(0);
    });

    it("dois 401 ao mesmo tempo disparam um único refresh (a API derruba tudo se um refresh token for reusado)", async () => {
      let releaseRefresh!: () => void;
      const refreshGate = new Promise<void>((resolve) => (releaseRefresh = resolve));
      const { client, api } = setup(
        {
          "POST /me/consent": (call) => (call.authorization === "Bearer access-1" ? { status: 204 } : { status: 401 }),
          "POST /auth/refresh": async () => {
            await refreshGate;
            return sessionReply();
          },
        },
        stored,
      );

      const both = Promise.all([client.saveConsent(consent), client.saveConsent(consent)]);
      await new Promise((r) => setTimeout(r, 0));
      releaseRefresh();
      await both;

      expect(api.count("POST /auth/refresh")).toBe(1);
      expect(api.count("POST /me/consent")).toBe(4);
    });
  });

  describe("logout", () => {
    it("revoga o refresh token na API e apaga a sessão local", async () => {
      const { client, api, storage } = setup({ "POST /auth/logout": () => ({ status: 204 }) }, stored);
      await client.logout();
      expect(api.calls[0].body).toEqual({ refreshToken: "refresh-0" });
      expect(storage.current).toBeNull();
    });

    it("sem rede ainda sai (apaga a sessão local)", async () => {
      const { client, storage } = setup({ "POST /auth/logout": () => "network-error" }, stored);
      await client.logout();
      expect(storage.current).toBeNull();
    });
  });
});
