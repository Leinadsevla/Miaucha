import { redirectTarget } from "../guard";

describe("redirectTarget", () => {
  it("usuário pronto pode navegar livremente pelo app", () => {
    expect(redirectTarget("/map", "/")).toBeNull();
    expect(redirectTarget("/occurrence/42", "/")).toBeNull();
    expect(redirectTarget("/", "/")).toBeNull();
  });

  it("usuário pronto que está numa tela de entrada vai para o início", () => {
    for (const p of ["/splash", "/login", "/verify-email", "/consent"]) {
      expect(redirectTarget(p, "/")).toBe("/");
    }
  });

  it("deslogado tentando abrir o app vai para o login", () => {
    expect(redirectTarget("/map", "/login")).toBe("/login");
    expect(redirectTarget("/", "/login")).toBe("/login");
  });

  it("não redireciona se já está no destino", () => {
    expect(redirectTarget("/login", "/login")).toBeNull();
    expect(redirectTarget("/consent", "/consent")).toBeNull();
  });

  it("a política de privacidade abre durante o login e o consentimento", () => {
    expect(redirectTarget("/privacy", "/login")).toBeNull();
    expect(redirectTarget("/privacy", "/consent")).toBeNull();
  });

  it("enquanto a sessão carrega, tudo vai para a splash", () => {
    expect(redirectTarget("/", "/splash")).toBe("/splash");
    expect(redirectTarget("/splash", "/splash")).toBeNull();
  });

  it("cadastro de pet só para quem está logado e com consentimento", () => {
    expect(redirectTarget("/pets/new", "/")).toBeNull();
    expect(redirectTarget("/pets/new", "/login")).toBe("/login");
    expect(redirectTarget("/pets/new", "/consent")).toBe("/consent");
  });

  it("esqueci a senha: liberada para quem saiu; depois de trocar a senha vai para o app", () => {
    expect(redirectTarget("/forgot-password", "/login")).toBeNull();
    expect(redirectTarget("/forgot-password", "/")).toBe("/");
    expect(redirectTarget("/forgot-password", "/splash")).toBe("/splash");
  });

  it("tutorial de boas-vindas: aberto para quem está no app; quem saiu vai para o login", () => {
    expect(redirectTarget("/welcome", "/")).toBeNull();
    expect(redirectTarget("/welcome", "/login")).toBe("/login");
  });
});

describe("retorno do login com Google (popup)", () => {
  it("a rota /google-callback nunca é redirecionada: ela só entrega o token e fecha", () => {
    for (const target of ["/splash", "/login", "/verify-email", "/consent", "/"] as const) {
      expect(redirectTarget("/google-callback", target)).toBeNull();
    }
  });
});
