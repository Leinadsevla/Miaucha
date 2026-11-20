import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import request from "supertest";
import { AppModule, configureApp } from "../src/app.module";
import { InvalidGoogleTokenError, type GoogleProfile, type GoogleVerifier } from "../src/auth/google-verifier";
import type { AppConfig, StorageConfig } from "../src/config";
import { runMigrations } from "../src/db/migrate";
import { GOOGLE_VERIFIER, MAILER } from "../src/tokens";
import type { Mailer } from "../src/mail/mailer";

export class FakeMailer implements Mailer {
  sent: { to: string; code: string }[] = [];

  async sendEmailCode(to: string, code: string) {
    this.sent.push({ to, code });
  }

  lastCodeFor(email: string): string {
    const found = [...this.sent].reverse().find((m) => m.to === email);
    if (!found) throw new Error(`Nenhum código enviado para ${email}`);
    return found.code;
  }
}

/** Substitui o google-auth-library: só aceita os tokens cadastrados no teste. */
export class FakeGoogleVerifier implements GoogleVerifier {
  tokens = new Map<string, GoogleProfile>();

  async verify(idToken: string): Promise<GoogleProfile> {
    const profile = this.tokens.get(idToken);
    if (!profile) throw new InvalidGoogleTokenError();
    return profile;
  }
}

export function storageConfigFromEnv(): StorageConfig {
  return {
    endpoint: process.env.STORAGE_ENDPOINT!,
    region: "us-east-1",
    bucket: "pet-photos",
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  };
}

export function testConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: 0,
    databaseUrl: process.env.DATABASE_URL!,
    jwtSecret: "jwt-secret-de-teste-com-32-caracteres!!",
    codeSecret: "code-secret-de-teste-com-32-caracteres!",
    accessTokenTtlSeconds: 900,
    refreshTokenTtlDays: 30,
    googleClientIds: ["teste.apps.googleusercontent.com"],
    throttle: { ttlMs: 60_000, limit: 1000 },
    storage: storageConfigFromEnv(),
    ...overrides,
  };
}

export type TestContext = {
  app: INestApplication;
  http: ReturnType<typeof request>;
  mailer: FakeMailer;
  google: FakeGoogleVerifier;
  pool: Pool;
};

export async function createTestApp(overrides: Partial<AppConfig> = {}): Promise<TestContext> {
  const config = testConfig(overrides);
  const pool = new Pool({ connectionString: config.databaseUrl });
  await runMigrations(pool);

  const mailer = new FakeMailer();
  const google = new FakeGoogleVerifier();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
    .overrideProvider(MAILER)
    .useValue(mailer)
    .overrideProvider(GOOGLE_VERIFIER)
    .useValue(google)
    .compile();

  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return { app, http: request(app.getHttpServer()), mailer, google, pool };
}

export async function closeTestApp(ctx: TestContext) {
  await ctx.app.close();
  await ctx.pool.end();
}

/**
 * Cada arquivo de teste roda num worker próprio contra o mesmo banco,
 * então os testes usam e-mails únicos em vez de apagar as tabelas.
 */
export function uniqueEmail(prefix = "tutor"): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@exemplo.com`;
}

export const PASSWORD = "senha1234";

/** Cadastra e confirma o e-mail; devolve a resposta do verify-email. */
export async function signUpVerified(ctx: TestContext, email = uniqueEmail(), name = "Ana Souza") {
  await ctx.http.post("/auth/signup").send({ name, email, password: PASSWORD }).expect(201);
  const res = await ctx.http.post("/auth/verify-email").send({ email, code: ctx.mailer.lastCodeFor(email) }).expect(200);
  return { email, body: res.body as SessionBody };
}

export type SessionBody = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; pseudonym: string; hasConsent: boolean };
};

/** Nenhuma resposta pode vazar hash de senha, e-mail ou campos internos. */
export function expectNoPrivateData(body: unknown, email?: string) {
  const json = JSON.stringify(body);
  expect(json).not.toMatch(/password|hash|\$argon2|google_?sub/i);
  if (email) expect(json.toLowerCase()).not.toContain(email.toLowerCase());
}
