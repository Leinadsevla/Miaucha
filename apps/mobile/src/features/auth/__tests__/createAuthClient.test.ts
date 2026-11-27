import { chooseApiUrl, chooseAuthClient, createMockClients, googleSignInFor, withDemoGoogle, type AppClients } from "../createAuthClient";

describe("chooseAuthClient", () => {
  it("com a URL da API → cliente HTTP", () => {
    expect(chooseAuthClient({ apiUrl: "http://192.168.0.10:3000", isDev: true })).toBe("http");
    expect(chooseAuthClient({ apiUrl: "https://api.miaucha.app", isDev: false })).toBe("http");
  });

  it("sem URL em desenvolvimento → cliente falso (dá para mexer nas telas sem a API)", () => {
    expect(chooseAuthClient({ apiUrl: undefined, isDev: true })).toBe("mock");
    expect(chooseAuthClient({ apiUrl: "  ", isDev: true })).toBe("mock");
  });

  it("modo demonstração (EXPO_PUBLIC_DEMO=1) → cliente falso, mesmo com a URL da API e num build de produção", () => {
    expect(chooseAuthClient({ apiUrl: "https://api.miaucha.app", isDev: false, demo: true })).toBe("mock");
    expect(chooseAuthClient({ apiUrl: undefined, isDev: false, demo: true })).toBe("mock");
  });

  it("sem URL num build de produção → erro, nunca o cliente falso", () => {
    expect(() => chooseAuthClient({ apiUrl: undefined, isDev: false })).toThrow("EXPO_PUBLIC_API_URL");
  });
});

describe("chooseApiUrl", () => {
  const render = "https://api.miaucha.app";
  const local = "http://localhost:3000";

  it("no navegador, EXPO_PUBLIC_WEB_API_URL tem prioridade (a API precisa liberar a origem por CORS)", () => {
    expect(chooseApiUrl({ os: "web", apiUrl: render, webApiUrl: local })).toBe(local);
  });

  it("no navegador sem a variável da web (ou vazia) → a URL geral", () => {
    expect(chooseApiUrl({ os: "web", apiUrl: render, webApiUrl: undefined })).toBe(render);
    expect(chooseApiUrl({ os: "web", apiUrl: render, webApiUrl: "  " })).toBe(render);
  });

  it("no aparelho, a variável da web é ignorada", () => {
    expect(chooseApiUrl({ os: "android", apiUrl: render, webApiUrl: local })).toBe(render);
    expect(chooseApiUrl({ os: "ios", apiUrl: undefined, webApiUrl: local })).toBeUndefined();
  });
});

describe("googleSignInFor", () => {
  it("na web com o Client ID configurado → login com Google de verdade", () => {
    const factory = jest.fn(() => ({ getIdToken: async () => "t" }));
    expect(googleSignInFor({ os: "web", webClientId: " abc.apps.googleusercontent.com ", create: factory })).toBeDefined();
    expect(factory).toHaveBeenCalledWith("abc.apps.googleusercontent.com");
  });

  it("sem Client ID → indisponível", () => {
    const factory = jest.fn(() => ({ getIdToken: async () => "t" }));
    expect(googleSignInFor({ os: "web", webClientId: undefined, create: factory })).toBeUndefined();
    expect(googleSignInFor({ os: "web", webClientId: "  ", create: factory })).toBeUndefined();
    expect(googleSignInFor({ os: "android", webClientId: undefined, createNative: factory })).toBeUndefined();
    expect(factory).not.toHaveBeenCalled();
  });

  it("no Android (development build ou APK) com o Client ID Web → login nativo", () => {
    const web = jest.fn(() => ({ getIdToken: async () => "w" }));
    const native = jest.fn(() => ({ getIdToken: async () => "n" }));
    expect(googleSignInFor({ os: "android", webClientId: " abc.apps.googleusercontent.com ", create: web, createNative: native })).toBeDefined();
    expect(native).toHaveBeenCalledWith("abc.apps.googleusercontent.com");
    expect(web).not.toHaveBeenCalled();
  });

  it("no Expo Go (sem o módulo nativo) e no iOS (sem build) → indisponível", () => {
    const native = jest.fn(() => ({ getIdToken: async () => "n" }));
    expect(googleSignInFor({ os: "android", webClientId: "abc", isExpoGo: true, createNative: native })).toBeUndefined();
    expect(googleSignInFor({ os: "ios", webClientId: "abc", createNative: native })).toBeUndefined();
    expect(native).not.toHaveBeenCalled();
  });
});

describe("withDemoGoogle (botão do Google sem credenciais, em desenvolvimento)", () => {
  const realAuth = (supportsGoogle: boolean) =>
    ({ supportsGoogle, loginWithGoogle: jest.fn(async () => ({ id: "real", name: "Real", hasConsent: true })), logout: jest.fn(async () => {}) }) as unknown as AppClients["auth"];
  const real = (supportsGoogle: boolean) => ({ ...createMockClients(), demo: false, auth: realAuth(supportsGoogle) }) as AppClients;

  it("sem Google configurado, em dev: o botão existe e entra na demonstração como Tutor Google", async () => {
    const swap = jest.fn();
    const clients = withDemoGoogle(real(false), { isDev: true, swap });
    expect(clients.auth.supportsGoogle).toBe(true);
    expect(clients.googleIsDemo).toBe(true);

    const user = await clients.auth.loginWithGoogle();
    expect(user.name).toBe("Tutor Google");
    const demo = swap.mock.calls[0][0] as AppClients;
    expect(demo.demo).toBe(true);
    // A sessão de demonstração já está aberta nos clientes novos (o app remonta e só restaura).
    expect((await demo.auth.restore())?.name).toBe("Tutor Google");
  });

  it("sair da demonstração devolve os clientes reais", async () => {
    const swap = jest.fn();
    const clients = withDemoGoogle(real(false), { isDev: true, swap });
    await clients.auth.loginWithGoogle();
    const demo = swap.mock.calls[0][0] as AppClients;
    await demo.auth.logout();
    expect(swap).toHaveBeenLastCalledWith(clients);
  });

  it("com o Google de verdade configurado, nada muda", () => {
    const original = real(true);
    expect(withDemoGoogle(original, { isDev: true, swap: jest.fn() })).toBe(original);
  });

  it("num build de produção sem Google, o botão continua escondido (nunca login falso)", () => {
    const original = real(false);
    const clients = withDemoGoogle(original, { isDev: false, swap: jest.fn() });
    expect(clients).toBe(original);
    expect(clients.auth.supportsGoogle).toBe(false);
  });
});
