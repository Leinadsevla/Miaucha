import { buildGoogleAuthUrl, createWebGoogleSignIn, GOOGLE_CALLBACK_PATH, idTokenFromCallback, type PopupWindow } from "../googleWeb";

const b64url = (o: object) => btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (payload: object) => `${b64url({ alg: "RS256" })}.${b64url(payload)}.assinatura`;

describe("buildGoogleAuthUrl", () => {
  it("pede só o ID token (openid, e-mail e perfil), com nonce, voltando para a rota de retorno do app", () => {
    const url = new URL(buildGoogleAuthUrl({ clientId: "abc.apps.googleusercontent.com", origin: "http://localhost:8081", nonce: "n1" }));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "abc.apps.googleusercontent.com",
      redirect_uri: `http://localhost:8081${GOOGLE_CALLBACK_PATH}`,
      response_type: "id_token",
      scope: "openid email profile",
      nonce: "n1",
      prompt: "select_account",
    });
  });
});

describe("idTokenFromCallback", () => {
  it("devolve o ID token quando o nonce confere", () => {
    const token = jwt({ nonce: "n1", email: "ana@exemplo.com" });
    expect(idTokenFromCallback(`#id_token=${token}&authuser=0`, "n1")).toBe(token);
  });

  it("nonce diferente (resposta de outro pedido) → erro", () => {
    expect(() => idTokenFromCallback(`#id_token=${jwt({ nonce: "outro" })}`, "n1")).toThrow("Resposta do Google inválida");
  });

  it("a pessoa cancelou ou o Google recusou → mensagem clara", () => {
    expect(() => idTokenFromCallback("#error=access_denied", "n1")).toThrow("Login com Google cancelado");
    expect(() => idTokenFromCallback("#error=redirect_uri_mismatch", "n1")).toThrow("O Google recusou o login (redirect_uri_mismatch)");
    expect(() => idTokenFromCallback("", "n1")).toThrow("Resposta do Google inválida");
  });
});

describe("createWebGoogleSignIn", () => {
  function setup({ popup }: { popup: PopupWindow | null }) {
    const listeners: ((e: { origin: string; data: unknown }) => void)[] = [];
    const open = jest.fn((_url: string) => popup);
    const signIn = createWebGoogleSignIn({
      clientId: "abc",
      origin: "http://localhost:8081",
      open,
      onMessage: (l) => {
        listeners.push(l);
        return () => void listeners.splice(listeners.indexOf(l), 1);
      },
      newNonce: () => "n1",
      pollMs: 10,
    });
    const send = (e: { origin: string; data: unknown }) => listeners.slice().forEach((l) => l(e));
    return { signIn, open, send, listeners };
  }

  it("abre a janela do Google e resolve com o ID token que a rota de retorno manda", async () => {
    const popup = { closed: false, close: jest.fn() };
    const { signIn, open, send, listeners } = setup({ popup });
    const pending = signIn.getIdToken();
    expect(open.mock.calls[0][0]).toContain("accounts.google.com");
    const token = jwt({ nonce: "n1" });
    send({ origin: "https://site-malicioso.example", data: { type: "miaucha-google", hash: `#id_token=${jwt({ nonce: "n1", sub: "falso" })}` } });
    send({ origin: "http://localhost:8081", data: { type: "miaucha-google", hash: `#id_token=${token}` } });
    await expect(pending).resolves.toBe(token);
    expect(popup.close).toHaveBeenCalled();
    expect(listeners).toHaveLength(0);
  });

  it("navegador bloqueou o popup → explica como liberar", async () => {
    const { signIn } = setup({ popup: null });
    await expect(signIn.getIdToken()).rejects.toThrow("O navegador bloqueou a janela do Google. Libere os pop-ups para este site e tente de novo.");
  });

  it("a pessoa fechou a janela sem entrar → cancelado", async () => {
    const popup = { closed: false, close: jest.fn() };
    const { signIn } = setup({ popup });
    const pending = signIn.getIdToken();
    popup.closed = true;
    await expect(pending).rejects.toThrow("Login com Google cancelado");
  });
});
