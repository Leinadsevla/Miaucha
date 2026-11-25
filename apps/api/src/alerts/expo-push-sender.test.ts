import { EXPO_PUSH_URL, ExpoPushSender, type PushMessage } from "./push-sender";

const message = (n: number): PushMessage => ({
  to: `ExponentPushToken[token${n}]`,
  title: "Pet perdido perto de você",
  body: "Thor · a 800 m",
  data: { occurrenceId: `o${n}`, alertId: `a${n}` },
});

function fakeFetch(respond: (messages: unknown[]) => unknown, status = 200) {
  const calls: { url: string; init: { method: string; headers: Record<string, string>; body: string } }[] = [];
  const fetch = jest.fn(async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
    calls.push({ url, init });
    const body = JSON.parse(init.body) as unknown[];
    return { ok: status < 400, status, json: async () => respond(body) };
  });
  return { fetch, calls };
}

const allOk = (messages: unknown[]) => ({ data: messages.map((_, i) => ({ status: "ok", id: `ticket-${i}` })) });

describe("ExpoPushSender (API HTTP do Expo Push)", () => {
  it("envia para a URL do Expo, com canal e som, em JSON", async () => {
    const { fetch, calls } = fakeFetch(allOk);
    await new ExpoPushSender({ fetch }).send([message(1)]);

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(EXPO_PUSH_URL);
    expect(calls[0].url).toBe("https://exp.host/--/api/v2/push/send");
    expect(calls[0].init.method).toBe("POST");
    expect(calls[0].init.headers["Content-Type"]).toBe("application/json");
    expect(calls[0].init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(calls[0].init.body)).toEqual([
      { ...message(1), sound: "default", channelId: "alerts", priority: "high" },
    ]);
  });

  it("com access token do Expo, manda no Authorization", async () => {
    const { fetch, calls } = fakeFetch(allOk);
    await new ExpoPushSender({ fetch, accessToken: "segredo" }).send([message(1)]);
    expect(calls[0].init.headers.Authorization).toBe("Bearer segredo");
  });

  it("divide em lotes de até 100 mensagens", async () => {
    const { fetch, calls } = fakeFetch(allOk);
    await new ExpoPushSender({ fetch }).send(Array.from({ length: 250 }, (_, i) => message(i)));
    expect(calls.map((c) => (JSON.parse(c.init.body) as unknown[]).length)).toEqual([100, 100, 50]);
  });

  it("lista vazia não chama a API", async () => {
    const { fetch } = fakeFetch(allOk);
    expect(await new ExpoPushSender({ fetch }).send([])).toEqual({ invalidTokens: [] });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("devolve os tokens recusados com DeviceNotRegistered (para apagar)", async () => {
    const { fetch } = fakeFetch(() => ({
      data: [
        { status: "ok", id: "1" },
        { status: "error", message: "not registered", details: { error: "DeviceNotRegistered" } },
        { status: "error", message: "rate", details: { error: "MessageRateExceeded" } },
      ],
    }));
    const result = await new ExpoPushSender({ fetch }).send([message(1), message(2), message(3)]);
    expect(result).toEqual({ invalidTokens: ["ExponentPushToken[token2]"] });
  });

  it("erro HTTP num lote não impede os outros", async () => {
    let call = 0;
    const fetch = jest.fn(async (_url: string, init: { body: string }) => {
      call++;
      const size = (JSON.parse(init.body) as unknown[]).length;
      if (call === 1) return { ok: false, status: 500, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => allOk(Array.from({ length: size })) };
    });
    const log = jest.fn();
    const result = await new ExpoPushSender({ fetch, log }).send(Array.from({ length: 150 }, (_, i) => message(i)));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ invalidTokens: [] });
    expect(log).toHaveBeenCalled();
  });

  it("falha de rede vira log, não exceção", async () => {
    const fetch = jest.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    const log = jest.fn();
    await expect(new ExpoPushSender({ fetch, log }).send([message(1)])).resolves.toEqual({ invalidTokens: [] });
    expect(log).toHaveBeenCalled();
  });
});
