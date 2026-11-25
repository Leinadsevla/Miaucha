import { RESEND_API_URL, ResendMailer } from "./resend-mailer";

type Call = { url: string; init: { method: string; headers: Record<string, string>; body: string } };

function fakeFetch(status = 200, body: unknown = { id: "email-1" }) {
  const calls: Call[] = [];
  const fetch = async (url: string, init: Call["init"]) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  };
  return { fetch, calls };
}

const logs: string[] = [];
const log = (m: string) => void logs.push(m);

describe("ResendMailer", () => {
  beforeEach(() => (logs.length = 0));

  it("envia o código de verificação pela API do Resend, com o remetente configurado", async () => {
    const { fetch, calls } = fakeFetch();
    await new ResendMailer({ apiKey: "re_teste", from: "Miaucha <codigo@miaucha.app>", fetch, log }).sendEmailCode("ana@exemplo.com", "123456");

    expect(calls[0].url).toBe(RESEND_API_URL);
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers).toMatchObject({ Authorization: "Bearer re_teste", "Content-Type": "application/json" });
    const body = JSON.parse(calls[0].init.body);
    expect(body).toMatchObject({ from: "Miaucha <codigo@miaucha.app>", to: ["ana@exemplo.com"], subject: "Seu código do Miaucha: 123456" });
    expect(body.text).toContain("123456");
    expect(body.text).toContain("10 minutos");
    expect(body.html).toContain("123456");
  });

  it("troca de senha tem assunto e texto próprios", async () => {
    const { fetch, calls } = fakeFetch();
    await new ResendMailer({ apiKey: "k", from: "f", fetch, log }).sendEmailCode("ana@exemplo.com", "654321", "reset");
    const body = JSON.parse(calls[0].init.body);
    expect(body.subject).toBe("Código para trocar sua senha no Miaucha: 654321");
    expect(body.text).toContain("trocar sua senha");
    expect(body.text).toContain("Se não foi você");
  });

  it("recusa do Resend (ex.: domínio de teste mandando para outra pessoa) → erro 503 para o app, sem o código no log", async () => {
    const { fetch } = fakeFetch(403, { name: "validation_error", message: "You can only send testing emails to your own email address" });
    const send = new ResendMailer({ apiKey: "k", from: "f", fetch, log }).sendEmailCode("bia@exemplo.com", "111222");

    await expect(send).rejects.toMatchObject({ status: 503, message: "Não foi possível enviar o e-mail com o código. Tente de novo em instantes." });
    expect(logs.join(" ")).toContain("403");
    expect(logs.join(" ")).toContain("testing emails");
    expect(logs.join(" ")).not.toContain("111222");
  });

  it("falha de rede também vira 503", async () => {
    const fetch = async () => Promise.reject(new Error("ECONNRESET"));
    await expect(new ResendMailer({ apiKey: "k", from: "f", fetch, log }).sendEmailCode("a@b.com", "1")).rejects.toMatchObject({ status: 503 });
  });
});
