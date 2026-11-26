export const colors = {
  primary: "#FF8A3D",
  /** Laranja mais fundo: botão pressionado e fim do degradê dos cabeçalhos. */
  primaryDeep: "#F2701F",
  primarySoft: "#FFF1E7",
  accent: "#2D6CDF",
  /** Azul mais fundo: botão azul pressionado. */
  accentDeep: "#2257BD",
  accentSoft: "#EAF1FD",
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

/** Cor `#RRGGBB` com opacidade de 0 a 1, no formato `#RRGGBBAA` (aceito pelo React Native e pela web). */
export function withAlpha(hex: string, alpha: number): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) throw new Error(`Cor inválida: ${hex} (use #RRGGBB)`);
  if (!(alpha >= 0 && alpha <= 1)) throw new Error(`Opacidade fora de 0..1: ${alpha}`);
  return `${hex}${Math.round(alpha * 255).toString(16).toUpperCase().padStart(2, "0")}`;
}

/** Escurecimento sobre fotos (botões em cima da imagem) e atrás de painéis. */
export const overlay = {
  photo: withAlpha(colors.foreground, 0.35),
  sheet: withAlpha(colors.foreground, 0.4),
} as const;

/**
 * Sombras em três níveis, sempre pelo `style` (o NativeWind não aceita sombra em classe condicional).
 * `boxShadow` funciona no React Native (nova arquitetura) e na web. A cor é o texto do app, não preto puro.
 */
export const elevation = {
  card: { boxShadow: "0px 1px 2px rgba(31, 36, 48, 0.06), 0px 4px 12px rgba(31, 36, 48, 0.05)" },
  raised: { boxShadow: "0px 2px 4px rgba(31, 36, 48, 0.06), 0px 8px 24px rgba(31, 36, 48, 0.08)" },
  floating: { boxShadow: "0px 4px 8px rgba(31, 36, 48, 0.08), 0px 16px 40px rgba(31, 36, 48, 0.14)" },
} as const;

export const BUTTON_VARIANTS = ["accent", "primary", "outline"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * Cores dos botões. Azul (`accent`) é a ação principal; o laranja da marca leva texto escuro, porque
 * branco sobre ele fica em 2,3:1 (o mínimo do WCAG AA é 4,5:1).
 */
const BUTTON_COLORS: Record<ButtonVariant, { background: string; pressed: string; text: string }> = {
  accent: { background: colors.accent, pressed: colors.accentDeep, text: colors.white },
  primary: { background: colors.primary, pressed: colors.primaryDeep, text: colors.foreground },
  outline: { background: colors.white, pressed: colors.muted, text: colors.foreground },
};

export function buttonColors(variant: ButtonVariant) {
  return BUTTON_COLORS[variant];
}

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
