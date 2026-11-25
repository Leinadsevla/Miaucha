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

/** `textOn`: cor do texto sobre a cor sólida do tipo (branco não é legível no amarelo nem no verde). */
const OCCURRENCE_STYLES: Record<OccurrenceType, { color: string; label: string; textOn: string }> = {
  lost: { color: colors.lost, label: "Perdido", textOn: colors.white },
  seen: { color: colors.seen, label: "Avistado", textOn: colors.foreground },
  found: { color: colors.found, label: "Encontrado", textOn: colors.foreground },
};

export function occurrenceStyle(type: OccurrenceType) {
  return OCCURRENCE_STYLES[type];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contraste entre duas cores `#RRGGBB` (fórmula do WCAG, de 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
