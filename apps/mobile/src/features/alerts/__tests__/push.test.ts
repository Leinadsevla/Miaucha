import { notificationTarget, pushAvailability, pushStatusMessage, registerForPush, type NotificationsApi, type PushEnvironment } from "../push";

const devBuild: PushEnvironment = { os: "android", isExpoGo: false, projectId: "proj-123" };

function fakeNotifications(overrides: Partial<NotificationsApi> = {}): NotificationsApi & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    setNotificationChannelAsync: async (id) => {
      calls.push(`channel:${id}`);
      return null;
    },
    getPermissionsAsync: async () => {
      calls.push("getPermissions");
      return { granted: false, canAskAgain: true };
    },
    requestPermissionsAsync: async () => {
      calls.push("requestPermissions");
      return { granted: true, canAskAgain: true };
    },
    getExpoPushTokenAsync: async (options) => {
      calls.push(`token:${options?.projectId}`);
      return { type: "expo", data: "ExponentPushToken[abc123]" };
    },
    ...overrides,
  };
}

describe("pushAvailability", () => {
  it("Expo Go no Android não tem push remoto desde o SDK 53", () => {
    expect(pushAvailability({ os: "android", isExpoGo: true, projectId: "p" })).toBe("expo-go-android");
  });

  it("sem projectId do EAS não há como pedir o token", () => {
    expect(pushAvailability({ os: "ios", isExpoGo: true, projectId: null })).toBe("no-project");
    expect(pushAvailability({ ...devBuild, projectId: null })).toBe("no-project");
  });

  it("web não tem push; development build e iOS no Expo Go com projeto, sim", () => {
    expect(pushAvailability({ os: "web", isExpoGo: false, projectId: "p" })).toBe("web");
    expect(pushAvailability(devBuild)).toBe("ok");
    expect(pushAvailability({ os: "ios", isExpoGo: true, projectId: "p" })).toBe("ok");
  });
});

describe("registerForPush", () => {
  it("cria o canal no Android, pede permissão, pega o token e registra na API", async () => {
    const notifications = fakeNotifications();
    const register = jest.fn(async () => {});
    expect(await registerForPush({ env: devBuild, notifications, register })).toEqual({ kind: "registered", token: "ExponentPushToken[abc123]" });
    expect(notifications.calls).toEqual(["channel:alerts", "getPermissions", "requestPermissions", "token:proj-123"]);
    expect(register).toHaveBeenCalledWith("ExponentPushToken[abc123]");
  });

  it("no Expo Go Android não chama nada do expo-notifications (não quebra)", async () => {
    const notifications = fakeNotifications();
    const register = jest.fn();
    expect(await registerForPush({ env: { ...devBuild, isExpoGo: true }, notifications, register })).toEqual({ kind: "unavailable", reason: "expo-go-android" });
    expect(notifications.calls).toEqual([]);
    expect(register).not.toHaveBeenCalled();
  });

  it("permissão já dada: não pergunta de novo", async () => {
    const notifications = fakeNotifications({ getPermissionsAsync: async () => ({ granted: true, canAskAgain: true }) });
    await registerForPush({ env: { ...devBuild, os: "ios" }, notifications, register: async () => {} });
    expect(notifications.calls).toEqual(["token:proj-123"]);
  });

  it("permissão negada → denied, sem token", async () => {
    const notifications = fakeNotifications({ requestPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    const register = jest.fn();
    expect(await registerForPush({ env: devBuild, notifications, register })).toEqual({ kind: "denied" });
    expect(register).not.toHaveBeenCalled();
  });

  it("negada sem poder perguntar: nem abre o diálogo", async () => {
    const notifications = fakeNotifications({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: false }) });
    expect(await registerForPush({ env: devBuild, notifications, register: async () => {} })).toEqual({ kind: "denied" });
    expect(notifications.calls).not.toContain("requestPermissions");
  });

  it("ask: false só confere a permissão, sem abrir o diálogo", async () => {
    const notifications = fakeNotifications({ getPermissionsAsync: async () => ({ granted: false, canAskAgain: true }) });
    expect(await registerForPush({ env: devBuild, notifications, register: async () => {}, ask: false })).toEqual({ kind: "denied" });
    expect(notifications.calls).not.toContain("requestPermissions");
  });

  it("erro do módulo ou da API vira status de erro com a etapa e o motivo (nunca lança)", async () => {
    const notifications = fakeNotifications({
      getExpoPushTokenAsync: async () => {
        throw new Error("Fetching the token failed");
      },
    });
    expect(await registerForPush({ env: devBuild, notifications, register: async () => {} })).toEqual({
      kind: "error",
      step: "token",
      detail: "Fetching the token failed",
    });
    const ok = fakeNotifications();
    expect(
      await registerForPush({
        env: devBuild,
        notifications: ok,
        register: async () => {
          throw new Error("sem rede");
        },
      }),
    ).toEqual({ kind: "error", step: "register", detail: "sem rede" });
  });
});

describe("pushStatusMessage", () => {
  it("explica cada situação em português", () => {
    expect(pushStatusMessage({ kind: "registered", token: "t" })).toBe("Notificações ativas neste aparelho.");
    expect(pushStatusMessage({ kind: "unavailable", reason: "expo-go-android" })).toMatch(/Expo Go.*development build/);
    expect(pushStatusMessage({ kind: "unavailable", reason: "no-project" })).toMatch(/EAS/);
    expect(pushStatusMessage({ kind: "denied" })).toMatch(/configurações/);
    expect(pushStatusMessage({ kind: "error", step: "token", detail: "Default FirebaseApp is not initialized" })).toBe(
      "O aparelho não gerou o token de notificação (Default FirebaseApp is not initialized). Os alertas continuam aparecendo na aba Alertas.",
    );
    expect(pushStatusMessage({ kind: "error", step: "register", detail: "sem rede" })).toBe(
      "Não foi possível salvar este aparelho para receber notificações (sem rede). Tentamos de novo quando você voltar ao app.",
    );
    expect(pushStatusMessage({ kind: "unavailable", reason: "web" })).toMatch(/aparece na aba Alertas/);
  });
});

describe("notificationTarget (AL-08)", () => {
  it("tira o id da ocorrência (e do alerta) do data do push", () => {
    expect(notificationTarget({ occurrenceId: "o1", alertId: "a1" })).toEqual({ occurrenceId: "o1", alertId: "a1" });
    expect(notificationTarget({ occurrenceId: "o1" })).toEqual({ occurrenceId: "o1" });
  });

  it("mensagem nova do chat (CH-04): tira o id da conversa", () => {
    expect(notificationTarget({ conversationId: "c1" })).toEqual({ conversationId: "c1" });
    expect(notificationTarget({ conversationId: "" })).toBeNull();
  });

  it("ignora notificação sem ocorrência ou com tipos errados", () => {
    expect(notificationTarget(undefined)).toBeNull();
    expect(notificationTarget({})).toBeNull();
    expect(notificationTarget({ occurrenceId: 42 })).toBeNull();
    expect(notificationTarget({ occurrenceId: "" })).toBeNull();
  });
});
