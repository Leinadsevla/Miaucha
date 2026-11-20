import { loadConfig } from "./config";

const required = {
  DATABASE_URL: "postgres://u:p@localhost:5432/miaucha",
  JWT_SECRET: "jwt-secret-com-pelo-menos-32-caracteres!",
  CODE_SECRET: "code-secret-com-pelo-menos-32-caracteres",
  STORAGE_ENDPOINT: "https://projeto.storage.supabase.co/storage/v1/s3",
  STORAGE_ACCESS_KEY_ID: "access-key",
  STORAGE_SECRET_ACCESS_KEY: "secret-key",
};

describe("loadConfig", () => {
  it("usa padrões quando só as variáveis obrigatórias existem", () => {
    const config = loadConfig(required);
    expect(config).toEqual({
      port: 3000,
      databaseUrl: required.DATABASE_URL,
      jwtSecret: required.JWT_SECRET,
      codeSecret: required.CODE_SECRET,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlDays: 30,
      googleClientIds: [],
      throttle: { ttlMs: 60_000, limit: 10 },
      storage: {
        endpoint: required.STORAGE_ENDPOINT,
        region: "us-east-1",
        bucket: "pet-photos",
        accessKeyId: "access-key",
        secretAccessKey: "secret-key",
      },
    });
  });

  it("lê região e bucket do storage", () => {
    const config = loadConfig({ ...required, STORAGE_REGION: "us-west-2", STORAGE_BUCKET: "fotos" });
    expect(config.storage).toMatchObject({ region: "us-west-2", bucket: "fotos" });
  });

  it("lê porta, client IDs do Google (separados por vírgula) e limite de requisições", () => {
    const config = loadConfig({
      ...required,
      PORT: "4000",
      GOOGLE_CLIENT_IDS: "android.apps.googleusercontent.com, ios.apps.googleusercontent.com",
      THROTTLE_LIMIT: "3",
      THROTTLE_TTL_MS: "1000",
    });
    expect(config.port).toBe(4000);
    expect(config.googleClientIds).toEqual(["android.apps.googleusercontent.com", "ios.apps.googleusercontent.com"]);
    expect(config.throttle).toEqual({ ttlMs: 1000, limit: 3 });
  });

  it.each(Object.keys(required))("falha sem %s", (key) => {
    const env: Record<string, string | undefined> = { ...required, [key]: undefined };
    expect(() => loadConfig(env)).toThrow(key);
  });

  it("recusa segredos curtos", () => {
    expect(() => loadConfig({ ...required, JWT_SECRET: "curto" })).toThrow("JWT_SECRET");
  });
});
