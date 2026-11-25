import { chooseAuthClient } from "../createAuthClient";

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
