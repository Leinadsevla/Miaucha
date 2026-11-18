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
