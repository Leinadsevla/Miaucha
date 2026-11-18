/** O corpo vem do cliente: qualquer campo pode faltar ou ter outro tipo. */
export function str(body: unknown, key: string): string {
  const value = (body as Record<string, unknown> | undefined)?.[key];
  return typeof value === "string" ? value : "";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
