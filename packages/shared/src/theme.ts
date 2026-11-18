export const colors = {
  primary: "#FF8A3D",
  primarySoft: "#FFF1E7",
  accent: "#2D6CDF",
  hope: "#FFD447",
  lost: "#EF4444",
  seen: "#F59E0B",
  found: "#22C55E",
  background: "#F7F7F9",
  card: "#FFFFFF",
  foreground: "#1F2430",
  muted: "#F1F1F4",
  mutedForeground: "#6B7280",
  border: "#E7E7EC",
  input: "#F3F3F6",
  white: "#FFFFFF",
} as const;

export const fonts = {
  regular: "Nunito_400Regular",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  black: "Nunito_900Black",
} as const;

export const OCCURRENCE_TYPES = ["lost", "seen", "found"] as const;
export type OccurrenceType = (typeof OCCURRENCE_TYPES)[number];

const OCCURRENCE_STYLES: Record<OccurrenceType, { color: string; label: string }> = {
  lost: { color: colors.lost, label: "Perdido" },
  seen: { color: colors.seen, label: "Avistado" },
  found: { color: colors.found, label: "Encontrado" },
};

export function occurrenceStyle(type: OccurrenceType) {
  return OCCURRENCE_STYLES[type];
}
