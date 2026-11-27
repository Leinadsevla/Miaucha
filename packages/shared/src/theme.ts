export const colors = {
  /** Cor da marca: o laranja original do Miaucha (faixas dos cabeçalhos, abas e ícones ativos, destaques). */
  brand: "#FF8A3D",
  /** Laranja de texto (links, botão suave): o `brand` como texto pequeno não passa no contraste AA. */
  brandDeep: "#A84A0E",
  /** Fundo suave da marca (item ativo, ícones, destaques) e o tom logo acima dele (borda, pressionado). */
  brandSoft: "#FFF1E7",
  brandTint: "#FFE1CC",
  /** Creme quase branco dos painéis grandes (tela de entrada em tela larga). */
  cream: "#FFF8F2",
  /** Azul: só para informação (avisos, ponto "você está aqui"), não para ações. */
  accent: "#2D6CDF",
  accentDeep: "#2257BD",
  accentSoft: "#EAF1FD",
  hope: "#FFD447",
  lost: "#EF4444",
  /** Vermelho de texto (mensagens de erro): o `lost` em texto pequeno não passa no contraste AA. */
  lostDeep: "#C52222",
  seen: "#F59E0B",
  found: "#22C55E",
  /** Fundos claros dos selos de tipo (o ponto do selo leva a cor sólida). */
  lostSoft: "#FDECEC",
  seenSoft: "#FEF3D7",
  foundSoft: "#E4F7EB",
  background: "#F8F8FA",
  card: "#FFFFFF",
  foreground: "#1F2430",
  inkDeep: "#12151D",
  muted: "#F1F1F4",
  mutedForeground: "#626978",
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
  card: { boxShadow: "0px 1px 2px rgba(31, 36, 48, 0.04), 0px 2px 8px rgba(31, 36, 48, 0.04)" },
  raised: { boxShadow: "0px 2px 4px rgba(31, 36, 48, 0.05), 0px 8px 24px rgba(31, 36, 48, 0.07)" },
  floating: { boxShadow: "0px 4px 8px rgba(31, 36, 48, 0.08), 0px 16px 40px rgba(31, 36, 48, 0.14)" },
} as const;

export const BUTTON_VARIANTS = ["brand", "soft", "outline"] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/**
 * Cores dos botões. `brand`: ação principal (azul, texto branco). `soft`: ação de apoio (fundo
 * suave da marca). `outline`: ação neutra. `hover`: mouse em cima (web).
 */
type ButtonColors = { background: string; hover: string; pressed: string; text: string };

const BUTTON_COLORS: Record<ButtonVariant, ButtonColors> = {
  // Ação principal em azul, como no visual original: branco sobre o laranja da marca não passa no AA.
  brand: { background: colors.accent, hover: colors.accentDeep, pressed: colors.accentDeep, text: colors.white },
  soft: { background: colors.brandSoft, hover: colors.brandTint, pressed: colors.brandTint, text: colors.brandDeep },
  outline: { background: colors.white, hover: colors.muted, pressed: colors.muted, text: colors.foreground },
};

export function buttonColors(variant: ButtonVariant): ButtonColors {
  return BUTTON_COLORS[variant];
}

/** Plus Jakarta Sans. Os nomes são os do pacote `@expo-google-fonts/plus-jakarta-sans` (não existe peso 900). */
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semibold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extrabold: "PlusJakartaSans_800ExtraBold",
} as const;

export const OCCURRENCE_TYPES = ["lost", "seen", "found"] as const;
export type OccurrenceType = (typeof OCCURRENCE_TYPES)[number];

/**
 * `color`: cor sólida do tipo (marcador do mapa, ponto do selo). `textOn`: texto sobre a cor sólida (branco
 * não é legível no amarelo nem no verde). `soft`: fundo claro do selo, que leva texto escuro.
 */
const OCCURRENCE_STYLES: Record<OccurrenceType, { color: string; label: string; textOn: string; soft: string }> = {
  lost: { color: colors.lost, label: "Perdido", textOn: colors.white, soft: colors.lostSoft },
  seen: { color: colors.seen, label: "Avistado", textOn: colors.foreground, soft: colors.seenSoft },
  found: { color: colors.found, label: "Encontrado", textOn: colors.foreground, soft: colors.foundSoft },
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
