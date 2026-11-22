const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export function formatTimeAgo(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MIN) return "agora";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min atrás`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h atrás`;
  const days = Math.floor(diff / DAY);
  return days === 1 ? "1 dia atrás" : `${days} dias atrás`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km >= 10) return `${Math.round(km)} km`;
  const rounded = Math.round(km * 10) / 10;
  return `${String(rounded).replace(".", ",")} km`;
}

/** Distância aproximada: abaixo de 1 km, de 100 em 100 m (mínimo 100 m). Usada nos alertas, cuja origem é uma célula de ~1 km. */
export function formatApproxDistance(meters: number): string {
  return formatDistance(meters < 950 ? Math.max(100, Math.round(meters / 100) * 100) : Math.max(1000, meters));
}
