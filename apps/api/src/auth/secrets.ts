import { createHash, createHmac, randomBytes, randomInt } from "node:crypto";

/** Sorteia um inteiro em [0, max). Injetável para os testes. */
export type Pick = (max: number) => number;

const cryptoPick: Pick = (max) => randomInt(max);

export const PSEUDONYM_NOUNS = ["Tutor", "Vizinho", "Amigo", "Guardião", "Parceiro", "Ajudante"] as const;
export const PSEUDONYM_COLORS = ["Laranja", "Azul", "Verde", "Roxo", "Amarelo", "Coral", "Turquesa", "Lilás", "Dourado", "Prata"] as const;

/** Nome público do usuário no chat e nas ocorrências (CH-02), ex.: "Tutor Laranja 42". */
export function generatePseudonym(pick: Pick = cryptoPick): string {
  const noun = PSEUDONYM_NOUNS[pick(PSEUDONYM_NOUNS.length)];
  const color = PSEUDONYM_COLORS[pick(PSEUDONYM_COLORS.length)];
  const number = 10 + pick(90);
  return `${noun} ${color} ${number}`;
}

export function generateEmailCode(pick: Pick = cryptoPick): string {
  return String(pick(1_000_000)).padStart(6, "0");
}

/** HMAC ligado ao e-mail: o banco nunca guarda o código, e o hash não é quebrável sem o segredo. */
export function hashEmailCode(secret: string, email: string, code: string): string {
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O token tem 256 bits aleatórios, então SHA-256 sem sal basta para guardá-lo. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
