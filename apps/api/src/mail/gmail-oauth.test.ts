import { GMAIL_REDIRECT_URI, buildGmailAuthUrl, exchangeGmailCode, extractAuthCode } from "./gmail-oauth";

describe("autorização do Gmail (pnpm gmail:authorize)", () => {
  it("link do Google pede só o envio, acesso offline e o consentimento (para vir o refresh token)", () => {
    const url = new URL(buildGmailAuthUrl("cliente.apps.googleusercontent.com"));
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      client_id: "cliente.apps.googleusercontent.com",
      redirect_uri: GMAIL_REDIRECT_URI,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send",
      access_type: "offline",
      prompt: "consent",
    });
  });

  it("aceita o endereço inteiro da barra do navegador ou só o código", () => {
    expect(extractAuthCode("http://localhost/?code=4%2F0Abc-def&scope=https://www.googleapis.com/auth/gmail.send")).toEqual({ code: "4/0Abc-def" });
    expect(extractAuthCode("  4/0Abc-def  ")).toEqual({ code: "4/0Abc-def" });
    expect(extractAuthCode("http://localhost/?error=access_denied")).toEqual({ error: "access_denied" });
    expect(extractAuthCode("")).toEqual({ error: "vazio" });
  });

  it("troca o código pelo refresh token", async () => {
    const calls: { url: string; body: string }[] = [];
    const fetch = async (url: string, init: { body: string }) => {
      calls.push({ url, body: init.body });
      return { ok: true, status: 200, json: async () => ({ access_token: "ya29", refresh_token: "1//refresh" }) };
    };
    const token = await exchangeGmailCode({ clientId: "c", clientSecret: "s", code: "4/0Abc", fetch });
    expect(token).toBe("1//refresh");
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    expect(Object.fromEntries(new URLSearchParams(calls[0].body))).toEqual({
      client_id: "c",
      client_secret: "s",
      code: "4/0Abc",
      redirect_uri: GMAIL_REDIRECT_URI,
      grant_type: "authorization_code",
    });
  });

  it("sem refresh token na resposta ou com erro do Google → mensagem clara", async () => {
    const noRefresh = async () => ({ ok: true, status: 200, json: async () => ({ access_token: "ya29" }) });
    await expect(exchangeGmailCode({ clientId: "c", clientSecret: "s", code: "x", fetch: noRefresh })).rejects.toThrow(
      "O Google não devolveu o refresh token",
    );
    const bad = async () => ({ ok: false, status: 400, json: async () => ({ error: "invalid_grant", error_description: "Bad Request" }) });
    await expect(exchangeGmailCode({ clientId: "c", clientSecret: "s", code: "x", fetch: bad })).rejects.toThrow("invalid_grant");
  });
});
