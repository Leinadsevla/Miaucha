import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { validateEmailCode, validateLogin, validateSignUp, type LoginInput, type SignUpInput } from "@miaucha/shared";
import * as argon2 from "argon2";
import { timingSafeEqual } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AppConfig } from "../config";
import { isUniqueViolation, transaction } from "../db/transaction";
import type { Mailer } from "../mail/mailer";
import { APP_CONFIG, GOOGLE_VERIFIER, MAILER, PG_POOL } from "../tokens";
import { normalizeEmail } from "./body";
import type { GoogleProfile, GoogleVerifier } from "./google-verifier";
import { generateEmailCode, generatePseudonym, generateRefreshToken, hashEmailCode, hashRefreshToken } from "./secrets";

export const CODE_TTL_MINUTES = 10;
export const MAX_CODE_ATTEMPTS = 5;
export const RESEND_COOLDOWN_SECONDS = 60;

type UserRow = { id: string; name: string; pseudonym: string; consent_at: Date | null };

/** O único formato de usuário que sai da API de autenticação: sem e-mail nem hash (CH-02). */
export type PublicUser = { id: string; name: string; pseudonym: string; hasConsent: boolean };
export type Session = { accessToken: string; refreshToken: string; user: PublicUser };

const USER_COLUMNS = "id, name, pseudonym, consent_at";

function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, name: row.name, pseudonym: row.pseudonym, hasConsent: row.consent_at !== null };
}

function invalid(errors: Record<string, string | undefined>): never {
  throw new BadRequestException({ message: "Confira os dados informados", errors });
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(GOOGLE_VERIFIER) private readonly google: GoogleVerifier,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly jwt: JwtService,
  ) {}

  async signUp(input: SignUpInput): Promise<void> {
    const errors = validateSignUp(input);
    if (Object.keys(errors).length > 0) invalid(errors);

    const email = normalizeEmail(input.email);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    try {
      await this.pool.query("insert into users (name, pseudonym, email, password_hash) values ($1, $2, $3, $4)", [
        input.name.trim(),
        generatePseudonym(),
        email,
        passwordHash,
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("Este e-mail já está cadastrado");
      throw error;
    }
    await this.sendEmailCode(email);
  }

  async verifyEmail(rawEmail: string, code: string): Promise<Session> {
    if (!validateEmailCode(code)) invalid({ code: "O código tem 6 dígitos" });
    const email = normalizeEmail(rawEmail);

    const user = await transaction(this.pool, async (client) => {
      const { rows } = await client.query<{ code_hash: string; expired: boolean; attempts: number }>(
        "select code_hash, expires_at < now() as expired, attempts from email_codes where email = $1 for update",
        [email],
      );
      const pending = rows[0];
      if (!pending || pending.expired || pending.attempts >= MAX_CODE_ATTEMPTS) return "gone" as const;

      if (!this.codeMatches(email, code, pending.code_hash)) {
        await client.query("update email_codes set attempts = attempts + 1 where email = $1", [email]);
        return "wrong" as const;
      }

      await client.query("delete from email_codes where email = $1", [email]);
      const updated = await client.query<UserRow>(
        `update users set email_verified_at = coalesce(email_verified_at, now()) where lower(email) = $1 returning ${USER_COLUMNS}`,
        [email],
      );
      return updated.rows[0] ?? ("gone" as const);
    });

    if (user === "gone") throw new GoneException("Código expirado. Peça um novo.");
    if (user === "wrong") throw new BadRequestException("Código incorreto");
    return this.issueSession(user);
  }

  async login(input: LoginInput): Promise<Session> {
    const errors = validateLogin(input);
    if (Object.keys(errors).length > 0) invalid(errors);

    const { rows } = await this.pool.query<UserRow & { password_hash: string | null; verified: boolean }>(
      `select ${USER_COLUMNS}, password_hash, email_verified_at is not null as verified from users where lower(email) = $1`,
      [normalizeEmail(input.email)],
    );
    const user = rows[0];
    // Sem conta (ou conta só do Google), ainda gasta o tempo de um argon2 para não revelar quem tem cadastro.
    const passwordOk = await argon2.verify(user?.password_hash ?? (await this.dummyHash()), input.password);
    if (!user?.password_hash || !passwordOk) throw new UnauthorizedException("E-mail ou senha incorretos");
    if (!user.verified) throw new ForbiddenException("Confirme seu e-mail para entrar");
    return this.issueSession(user);
  }

  /** Entra pelo `sub` do Google; senão liga à conta com o mesmo e-mail; senão cria uma conta nova. */
  async loginWithGoogle(idToken: string): Promise<Session> {
    const failed = () => new UnauthorizedException("Não foi possível entrar com o Google");
    let profile: GoogleProfile;
    try {
      profile = await this.google.verify(idToken);
    } catch {
      throw failed();
    }
    if (!profile.emailVerified) throw failed();
    const email = normalizeEmail(profile.email);
    const googleName = profile.name.trim() || "Tutor";

    const user = await transaction(this.pool, async (client) => {
      const bySub = await client.query<UserRow>(`select ${USER_COLUMNS} from users where google_sub = $1`, [profile.sub]);
      if (bySub.rows[0]) return bySub.rows[0];

      // Cadastro não verificado: senha e nome nunca foram comprovados. Descartá-los impede o sequestro da conta.
      const linked = await client.query<UserRow>(
        `update users
            set google_sub = $1,
                password_hash = case when email_verified_at is null then null else password_hash end,
                name = case when email_verified_at is null then $3 else name end,
                email_verified_at = coalesce(email_verified_at, now())
          where lower(email) = $2 and google_sub is null
          returning ${USER_COLUMNS}`,
        [profile.sub, email, googleName],
      );
      if (linked.rows[0]) return linked.rows[0];

      const created = await client.query<UserRow>(
        `insert into users (name, pseudonym, email, google_sub, email_verified_at)
         values ($1, $2, $3, $4, now())
         on conflict do nothing
         returning ${USER_COLUMNS}`,
        [googleName, generatePseudonym(), email, profile.sub],
      );
      // Sem linha: o e-mail já pertence a outra conta Google.
      return created.rows[0] ?? null;
    });
    if (!user) throw failed();
    return this.issueSession(user);
  }

  /** Rotação: cada refresh token vale uma vez. Reusar um token já trocado indica roubo e derruba todas as sessões. */
  async refresh(refreshToken: string): Promise<Session> {
    const result = await transaction(this.pool, async (client) => {
      const { rows } = await client.query<{ id: string; user_id: string; revoked: boolean; expired: boolean }>(
        `select id, user_id, revoked_at is not null as revoked, expires_at < now() as expired
           from refresh_tokens where token_hash = $1 for update`,
        [hashRefreshToken(refreshToken)],
      );
      const token = rows[0];
      if (!token || token.expired) return null;
      if (token.revoked) {
        await client.query("update refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [
          token.user_id,
        ]);
        return null;
      }
      await client.query("update refresh_tokens set revoked_at = now() where id = $1", [token.id]);
      const user = await client.query<UserRow>(`select ${USER_COLUMNS} from users where id = $1`, [token.user_id]);
      return this.issueSession(user.rows[0], client);
    });
    if (!result) throw new UnauthorizedException("Sessão expirada. Entre de novo.");
    return result;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.pool.query("update refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null", [
      hashRefreshToken(refreshToken),
    ]);
  }

  /** Não revela se o e-mail tem conta: desconhecido ou já verificado responde igual, sem enviar nada. */
  async resendCode(rawEmail: string): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const { rows } = await this.pool.query<{ recently_sent: boolean | null }>(
      `select (select sent_at > now() - make_interval(secs => $2) from email_codes where email = $1) as recently_sent
         from users where lower(email) = $1 and email_verified_at is null`,
      [email, RESEND_COOLDOWN_SECONDS],
    );
    if (rows.length === 0) return;
    if (rows[0].recently_sent) {
      throw new HttpException("Aguarde um minuto para pedir outro código", HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.sendEmailCode(email);
  }

  private dummyHashPromise?: Promise<string>;

  private dummyHash(): Promise<string> {
    this.dummyHashPromise ??= argon2.hash("senha-que-ninguem-tem-1", { type: argon2.argon2id });
    return this.dummyHashPromise;
  }

  private codeMatches(email: string, code: string, storedHash: string): boolean {
    const given = Buffer.from(hashEmailCode(this.config.codeSecret, email, code), "hex");
    const stored = Buffer.from(storedHash, "hex");
    return given.length === stored.length && timingSafeEqual(given, stored);
  }

  /** Grava (ou substitui) o código pendente do e-mail, zerando as tentativas, e envia. */
  private async sendEmailCode(email: string): Promise<void> {
    const code = generateEmailCode();
    await this.pool.query(
      `insert into email_codes (email, code_hash, expires_at, attempts, sent_at)
       values ($1, $2, now() + make_interval(mins => $3), 0, now())
       on conflict (email) do update
         set code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0, sent_at = now()`,
      [email, hashEmailCode(this.config.codeSecret, email, code), CODE_TTL_MINUTES],
    );
    await this.mailer.sendEmailCode(email, code);
  }

  private async issueSession(user: UserRow, client: Pool | PoolClient = this.pool): Promise<Session> {
    const accessToken = await this.jwt.signAsync({ sub: user.id }, { expiresIn: this.config.accessTokenTtlSeconds });
    const refreshToken = generateRefreshToken();
    await client.query(
      "insert into refresh_tokens (user_id, token_hash, expires_at) values ($1, $2, now() + make_interval(days => $3))",
      [user.id, hashRefreshToken(refreshToken), this.config.refreshTokenTtlDays],
    );
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
