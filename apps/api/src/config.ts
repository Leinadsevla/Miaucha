/** Storage S3 compatível (Supabase Storage, Cloudflare R2...). O bucket precisa ser privado (NF-05). */
export type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type AppConfig = {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  /** Segredo do HMAC dos códigos de e-mail (6 dígitos sem segredo seriam quebrados offline). */
  codeSecret: string;
  accessTokenTtlSeconds: number;
  refreshTokenTtlDays: number;
  /** Client IDs do Google aceitos como `aud` do ID token (Android, iOS, web). */
  googleClientIds: string[];
  /** Rate limit das rotas de autenticação (NF-04). */
  throttle: { ttlMs: number; limit: number };
  /** Limite de mensagens do chat, por usuário (NF-04). Sem ele, 30 por minuto. */
  chatThrottle?: { ttlMs: number; limit: number };
  /**
   * Redis para o adapter do Socket.IO (CH-03): só é preciso com mais de uma instância da API,
   * para um evento emitido numa chegar aos sockets conectados nas outras.
   */
  redisUrl?: string;
  storage: StorageConfig;
  /** Access token do Expo Push (opcional; só se o projeto exigir "enhanced security" no painel do Expo). */
  expoAccessToken?: string;
  /** Quantos proxies ficam na frente da API (Render: 1). Com 0, o `X-Forwarded-For` é ignorado. */
  trustProxy: number;
  /** E-mail pelo Resend; sem `RESEND_API_KEY`, os códigos só aparecem no log (desenvolvimento). */
  resend?: { apiKey: string; from: string };
  /** E-mail pela API do Gmail (tem prioridade sobre o Resend). Refresh token gerado com `pnpm gmail:authorize`. */
  gmail?: { clientId: string; clientSecret: string; refreshToken: string; sender: string };
};

export const DEFAULT_CHAT_THROTTLE = { ttlMs: 60_000, limit: 30 };

type Env = Record<string, string | undefined>;

const MIN_SECRET_LENGTH = 32;

function required(env: Env, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Variável de ambiente ${key} não definida`);
  return value;
}

function secret(env: Env, key: string): string {
  const value = required(env, key);
  if (value.length < MIN_SECRET_LENGTH) throw new Error(`${key} precisa de pelo menos ${MIN_SECRET_LENGTH} caracteres`);
  return value;
}

function int(env: Env, key: string, fallback: number): number {
  const value = env[key];
  return value ? Number.parseInt(value, 10) : fallback;
}

/** Remove espaços, quebras de linha e aspas em volta: valores colados no painel do Render costumam vir assim. */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim().replace(/^(["'])(.*)\1$/s, "$2").trim();
  return trimmed || undefined;
}

const GMAIL_VARS = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER"] as const;

/** As quatro variáveis juntas ou nenhuma: configuração pela metade falha ao subir, em vez de falhar no primeiro cadastro. */
function gmailConfig(env: Env): AppConfig["gmail"] {
  const missing = GMAIL_VARS.filter((key) => !clean(env[key]));
  if (missing.length === GMAIL_VARS.length) return undefined;
  if (missing.length > 0) throw new Error(`Configuração do Gmail incompleta: falta ${missing.join(", ")}`);
  return {
    clientId: clean(env.GMAIL_CLIENT_ID)!,
    clientSecret: clean(env.GMAIL_CLIENT_SECRET)!,
    refreshToken: clean(env.GMAIL_REFRESH_TOKEN)!,
    sender: clean(env.GMAIL_SENDER)!,
  };
}

/** Provedor de e-mail ativo, na mesma prioridade do AppModule (Gmail > Resend > log). */
export function mailProvider(config: Pick<AppConfig, "gmail" | "resend">): "gmail" | "resend" | "log" {
  return config.gmail ? "gmail" : config.resend ? "resend" : "log";
}

export function loadConfig(env: Env): AppConfig {
  return {
    port: int(env, "PORT", 3000),
    databaseUrl: required(env, "DATABASE_URL"),
    jwtSecret: secret(env, "JWT_SECRET"),
    codeSecret: secret(env, "CODE_SECRET"),
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 30,
    googleClientIds: (env.GOOGLE_CLIENT_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    throttle: { ttlMs: int(env, "THROTTLE_TTL_MS", 60_000), limit: int(env, "THROTTLE_LIMIT", 10) },
    chatThrottle: {
      ttlMs: int(env, "CHAT_THROTTLE_TTL_MS", DEFAULT_CHAT_THROTTLE.ttlMs),
      limit: int(env, "CHAT_THROTTLE_LIMIT", DEFAULT_CHAT_THROTTLE.limit),
    },
    redisUrl: env.REDIS_URL || undefined,
    storage: {
      endpoint: required(env, "STORAGE_ENDPOINT"),
      region: env.STORAGE_REGION || "us-east-1",
      bucket: env.STORAGE_BUCKET || "pet-photos",
      accessKeyId: required(env, "STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: required(env, "STORAGE_SECRET_ACCESS_KEY"),
    },
    expoAccessToken: env.EXPO_ACCESS_TOKEN || undefined,
    trustProxy: int(env, "TRUST_PROXY", 0),
    // Sem domínio verificado, o remetente de teste do Resend só entrega para o e-mail do dono da conta.
    gmail: gmailConfig(env),
    resend: clean(env.RESEND_API_KEY)
      ? { apiKey: clean(env.RESEND_API_KEY)!, from: clean(env.MAIL_FROM) ?? "Miaucha <onboarding@resend.dev>" }
      : undefined,
  };
}
