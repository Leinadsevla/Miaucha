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
};

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
  };
}
