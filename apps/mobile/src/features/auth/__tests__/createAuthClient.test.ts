import { chooseApiUrl, chooseAuthClient } from "../createAuthClient";

describe("chooseAuthClient", () => {
  it("com a URL da API → cliente HTTP", () => {
    expect(chooseAuthClient({ apiUrl: "http://192.168.0.10:3000", isDev: true })).toBe("http");
    expect(chooseAuthClient({ apiUrl: "https://api.miaucha.app", isDev: false })).toBe("http");
  });

  it("sem URL em desenvolvimento → cliente falso (dá para mexer nas telas sem a API)", () => {
    expect(chooseAuthClient({ apiUrl: undefined, isDev: true })).toBe("mock");
    expect(chooseAuthClient({ apiUrl: "  ", isDev: true })).toBe("mock");
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
