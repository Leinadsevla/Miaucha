/** O corpo vem do cliente: qualquer campo pode faltar ou ter outro tipo. */
export function str(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : "";
}

/** Só aceita número de verdade (texto como "-23.5" vira NaN e cai na validação). */
export function num(body: unknown, key: string): number {
  const value = (body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "number" ? value : Number.NaN;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
