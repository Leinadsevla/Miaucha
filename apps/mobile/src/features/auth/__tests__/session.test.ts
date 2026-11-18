import { authReducer, routeFor, initialAuthState, type AuthState } from "../session";

describe("routeFor", () => {
  it.each<[AuthState, string]>([
    [{ status: "loading" }, "/splash"],
    [{ status: "signedOut" }, "/login"],
    [{ status: "pendingVerification", email: "ana@exemplo.com" }, "/verify-email"],
    [{ status: "signedIn", user: { id: "1", name: "Ana", hasConsent: false } }, "/consent"],
    [{ status: "signedIn", user: { id: "1", name: "Ana", hasConsent: true } }, "/"],
  ])("%j → %s", (state, route) => {
    expect(routeFor(state)).toBe(route);
  });
});

describe("authReducer", () => {
  const user = { id: "1", name: "Ana", hasConsent: false };

  it("começa carregando", () => {
    expect(initialAuthState).toEqual({ status: "loading" });
  });

  it("sem sessão salva vai para signedOut", () => {
    expect(authReducer(initialAuthState, { type: "restored", user: null })).toEqual({ status: "signedOut" });
  });

  it("sessão salva vai direto para signedIn", () => {
    expect(authReducer(initialAuthState, { type: "restored", user })).toEqual({ status: "signedIn", user });
  });

  it("cadastro espera a verificação do e-mail", () => {
    expect(authReducer({ status: "signedOut" }, { type: "signedUp", email: "ana@exemplo.com" })).toEqual({
      status: "pendingVerification",
      email: "ana@exemplo.com",
    });
  });

  it("login ou verificação entram na conta", () => {
    expect(authReducer({ status: "signedOut" }, { type: "signedIn", user })).toEqual({ status: "signedIn", user });
    expect(
      authReducer({ status: "pendingVerification", email: "a@b.com" }, { type: "signedIn", user }),
    ).toEqual({ status: "signedIn", user });
  });

  it("aceitar o consentimento atualiza o usuário", () => {
    expect(authReducer({ status: "signedIn", user }, { type: "consentGiven" })).toEqual({
      status: "signedIn",
      user: { ...user, hasConsent: true },
    });
  });

  it("consentimento sem estar logado não muda nada", () => {
    const state: AuthState = { status: "signedOut" };
    expect(authReducer(state, { type: "consentGiven" })).toBe(state);
  });

  it("sair volta para signedOut", () => {
    expect(authReducer({ status: "signedIn", user }, { type: "signedOut" })).toEqual({ status: "signedOut" });
  });
});
