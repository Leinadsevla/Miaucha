import { GMAIL_SEND_URL, GMAIL_TOKEN_URL, GmailApiMailer } from "./gmail-mailer";

type Init = { method: string; headers: Record<string, string>; body: string };
type Reply = { status: number; body: unknown };

function fakeGoogle(replies: { token?: Reply[]; send?: Reply[] } = {}) {
  const calls: { url: string; init: Init }[] = [];
  const token = replies.token ?? [{ status: 200, body: { access_token: "ya29.acesso", expires_in: 3599 } }];
  const send = replies.send ?? [{ status: 200, body: { id: "msg-1" } }];
  const fetch = async (url: string, init: Init) => {
    calls.push({ url, init });
    const queue = url === GMAIL_TOKEN_URL ? token : send;
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
  };
  return { fetch, calls };
}

const credentials = { clientId: "cliente.apps.googleusercontent.com", clientSecret: "segredo", refreshToken: "1//refresh", sender: "projeto.miaucha@gmail.com" };
const logs: string[] = [];
const log = (m: string) => void logs.push(m);

/** Decodifica o `raw` (base64url) enviado ao Gmail. */
function decodeRaw(body: string): string {
  return Buffer.from(JSON.parse(body).raw, "base64url").toString("utf8");
}

/** Junta as partes base64 do MIME e decodifica, para procurar o texto do e-mail. */
function decodedParts(mime: string): string {
  return mime
    .split(/\r\n\r\n/)
    .slice(1)
    .map((chunk) => chunk.split(/\r\n--/)[0].replace(/\r\n/g, ""))
    .filter((chunk) => /^[A-Za-z0-9+/=]+$/.test(chunk))
    .map((b64) => Buffer.from(b64, "base64").toString("utf8"))
    .join("\n");
}

describe("GmailApiMailer", () => {
  beforeEach(() => (logs.length = 0));

  it("renova o acesso com o refresh token e envia pela API do Gmail", async () => {
    const { fetch, calls } = fakeGoogle();
    await new GmailApiMailer({ ...credentials, fetch, log }).sendEmailCode("ana@exemplo.com", "123456");

    expect(calls[0].url).toBe(GMAIL_TOKEN_URL);
    const form = new URLSearchParams(calls[0].init.body);
    expect(Object.fromEntries(form)).toEqual({
      client_id: credentials.clientId,
      client_secret: "segredo",
      refresh_token: "1//refresh",
      grant_type: "refresh_token",
    });

    expect(calls[1].url).toBe(GMAIL_SEND_URL);
    expect(calls[1].init.headers.Authorization).toBe("Bearer ya29.acesso");
    const mime = decodeRaw(calls[1].init.body);
    expect(mime).toContain("To: ana@exemplo.com");
    expect(mime).toContain("From: Miaucha <projeto.miaucha@gmail.com>");
    const subject = mime.match(/^Subject: =\?UTF-8\?B\?(.+)\?=$/m)![1];
    expect(Buffer.from(subject, "base64").toString("utf8")).toBe("Seu código do Miaucha: 123456");
    expect(mime).toContain("multipart/alternative");
    expect(decodedParts(mime)).toContain("10 minutos");
    expect(decodedParts(mime)).toContain("123456");
  });

  it("reaproveita o acesso entre envios (só renova perto de expirar)", async () => {
    const { fetch, calls } = fakeGoogle();
    const mailer = new GmailApiMailer({ ...credentials, fetch, log });
    await mailer.sendEmailCode("a@exemplo.com", "1");
    await mailer.sendEmailCode("b@exemplo.com", "2");
    expect(calls.filter((c) => c.url === GMAIL_TOKEN_URL)).toHaveLength(1);
  });

  it("autorização revogada ou expirada → 503, e o log diz para autorizar de novo", async () => {
    const { fetch } = fakeGoogle({ token: [{ status: 400, body: { error: "invalid_grant", error_description: "Token has been expired or revoked." } }] });
    await expect(new GmailApiMailer({ ...credentials, fetch, log }).sendEmailCode("a@exemplo.com", "987654")).rejects.toMatchObject({
      status: 503,
      message: "Não foi possível enviar o e-mail com o código. Tente de novo em instantes.",
    });
    expect(logs.join(" ")).toContain("invalid_grant");
    expect(logs.join(" ")).toContain("gmail:authorize");
    expect(logs.join(" ")).not.toContain("987654");
  });

  it("recusa do Gmail no envio (ex.: limite diário) → 503 sem o código no log", async () => {
    const { fetch } = fakeGoogle({ send: [{ status: 429, body: { error: { message: "User-rate limit exceeded" } } }] });
    await expect(new GmailApiMailer({ ...credentials, fetch, log }).sendEmailCode("a@exemplo.com", "555666")).rejects.toMatchObject({ status: 503 });
    expect(logs.join(" ")).toContain("429");
    expect(logs.join(" ")).not.toContain("555666");
  });

  it("falha de rede → 503", async () => {
    const fetch = async () => Promise.reject(new Error("ETIMEDOUT"));
    await expect(new GmailApiMailer({ ...credentials, fetch, log }).sendEmailCode("a@exemplo.com", "1")).rejects.toMatchObject({ status: 503 });
  });
});
