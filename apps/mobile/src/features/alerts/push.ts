/** Canal Android dos alertas (o mesmo `channelId` que a API manda no push). */
export const ALERT_CHANNEL_ID = "alerts";

export type PushEnvironment = {
  os: string;
  /** Expo Go (não um development build). */
  isExpoGo: boolean;
  /** `extra.eas.projectId` do app.json (exigido para pedir o token do Expo Push). */
  projectId: string | null;
};

export type PushAvailability = "ok" | "expo-go-android" | "no-project" | "web";

export type PushStatus =
  | { kind: "registered"; token: string }
  | { kind: "unavailable"; reason: Exclude<PushAvailability, "ok"> }
  | { kind: "denied" }
  /** `step`: onde falhou (gerar o token no aparelho ou salvar na API); `detail`: a mensagem do erro. */
  | { kind: "error"; step: "token" | "register"; detail: string };

const errorDetail = (error: unknown) => (error instanceof Error ? error.message : String(error));

type Permission = { granted: boolean; canAskAgain: boolean };

/** Subconjunto do expo-notifications usado aqui; injetável nos testes. */
export type NotificationsApi = {
  setNotificationChannelAsync(id: string, channel: { name: string; importance: number }): Promise<unknown>;
  getPermissionsAsync(): Promise<Permission>;
  requestPermissionsAsync(): Promise<Permission>;
  getExpoPushTokenAsync(options?: { projectId?: string }): Promise<{ type: string; data: string }>;
};

/** Importância HIGH do Android (`AndroidImportance.HIGH`), para o alerta aparecer como banner. */
const ANDROID_IMPORTANCE_HIGH = 6;

/** Desde o SDK 53 o Expo Go no Android não recebe push remoto: só o development build. */
export function pushAvailability({ os, isExpoGo, projectId }: PushEnvironment): PushAvailability {
  if (os === "web") return "web";
  if (os === "android" && isExpoGo) return "expo-go-android";
  if (!projectId) return "no-project";
  return "ok";
}

/** Pede permissão, pega o token do Expo Push e registra na API. Nunca lança. */
export async function registerForPush({
  env,
  notifications,
  register,
  ask = true,
  onPermissionStep,
}: {
  env: PushEnvironment;
  notifications: NotificationsApi;
  register: (token: string) => Promise<void>;
  /** false: só confere a permissão (nas novas tentativas, para não abrir o diálogo toda vez que o app volta). */
  ask?: boolean;
  /** Chamado quando a tentativa chega à etapa da permissão (só a partir daí o diálogo pode ter aparecido). */
  onPermissionStep?: () => void;
}): Promise<PushStatus> {
  const availability = pushAvailability(env);
  if (availability !== "ok") return { kind: "unavailable", reason: availability };
  let token: string;
  try {
    if (env.os === "android") {
      await notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, { name: "Alertas de pets por perto", importance: ANDROID_IMPORTANCE_HIGH });
    }
    let permission = await notifications.getPermissionsAsync();
    onPermissionStep?.();
    if (!permission.granted && permission.canAskAgain && ask) permission = await notifications.requestPermissionsAsync();
    if (!permission.granted) return { kind: "denied" };
    ({ data: token } = await notifications.getExpoPushTokenAsync({ projectId: env.projectId! }));
  } catch (error) {
    return { kind: "error", step: "token", detail: errorDetail(error) };
  }
  try {
    await register(token);
  } catch (error) {
    return { kind: "error", step: "register", detail: errorDetail(error) };
  }
  return { kind: "registered", token };
}

export function pushStatusMessage(status: PushStatus): string {
  switch (status.kind) {
    case "registered":
      return "Notificações ativas neste aparelho.";
    case "denied":
      return "As notificações estão bloqueadas. Libere nas configurações do aparelho para receber alertas na hora.";
    case "error":
      return status.step === "token"
        ? `O aparelho não gerou o token de notificação (${status.detail}). Os alertas continuam aparecendo na aba Alertas.`
        : `Não foi possível salvar este aparelho para receber notificações (${status.detail}). Tentamos de novo quando você voltar ao app.`;
    case "unavailable":
      switch (status.reason) {
        case "expo-go-android":
          return "O Expo Go no Android não recebe notificações push (desde o SDK 53). Os alertas aparecem na aba Alertas; para receber push, use o development build.";
        case "no-project":
          return "Notificações push ainda não configuradas (falta o projeto no EAS). Os alertas aparecem na aba Alertas.";
        case "web":
          return "Sem notificações push nesta plataforma. Cada alerta aparece na aba Alertas.";
      }
  }
}

/** Para onde o toque na notificação leva: a ocorrência de um alerta (AL-08) ou a conversa de uma mensagem (CH-04). */
export type NotificationTarget = { occurrenceId: string; alertId?: string } | { conversationId: string };

/** AL-08: o `data` do push traz o `occurrenceId` (e o `alertId`, para marcar como visto); CH-04 traz o `conversationId`. */
export function notificationTarget(data: unknown): NotificationTarget | null {
  const d = data as { occurrenceId?: unknown; alertId?: unknown; conversationId?: unknown } | null | undefined;
  if (typeof d?.conversationId === "string" && d.conversationId) return { conversationId: d.conversationId };
  if (typeof d?.occurrenceId !== "string" || !d.occurrenceId) return null;
  return typeof d.alertId === "string" && d.alertId ? { occurrenceId: d.occurrenceId, alertId: d.alertId } : { occurrenceId: d.occurrenceId };
}
