import { buttonColors, BUTTON_VARIANTS, colors, contrastRatio, elevation, fonts, occurrenceStyle, OCCURRENCE_TYPES, overlay, withAlpha } from "../theme";

describe("tokens do design", () => {
  it("a cor da marca é um laranja queimado: texto branco sobre ela e ela como texto passam no AA (4,5:1)", () => {
    expect(contrastRatio(colors.brand, colors.white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.brand, colors.brandSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.brandDeep, colors.white)).toBeGreaterThan(contrastRatio(colors.brand, colors.white));
  });

  it("não existe mais o laranja saturado de fundo nem degradê", () => {
    for (const gone of ["primary", "primaryDeep", "primarySoft", "cta", "ctaDeep"]) expect(colors).not.toHaveProperty(gone);
  });

  it("fundos claros (app, creme, suave da marca) aceitam o texto do app e o texto secundário", () => {
    for (const surface of [colors.background, colors.cream, colors.brandSoft, colors.card]) {
      expect(contrastRatio(surface, colors.foreground)).toBeGreaterThan(12);
      expect(contrastRatio(surface, colors.mutedForeground)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("texto de erro usa um vermelho mais fundo, legível sobre branco (o vermelho do tipo fica em 3,8:1)", () => {
    expect(contrastRatio(colors.lostDeep, colors.white)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(colors.lostDeep, colors.lostSoft)).toBeGreaterThanOrEqual(4.5);
  });

  it("fonte Plus Jakarta Sans em cinco pesos (não existe 900)", () => {
    expect(fonts).toEqual({
      regular: "PlusJakartaSans_400Regular",
      medium: "PlusJakartaSans_500Medium",
      semibold: "PlusJakartaSans_600SemiBold",
      bold: "PlusJakartaSans_700Bold",
      extrabold: "PlusJakartaSans_800ExtraBold",
    });
  });
});

describe("occurrenceStyle (MP-01)", () => {
  it("perdido é vermelho", () => {
    expect(occurrenceStyle("lost")).toMatchObject({ color: colors.lost, label: "Perdido" });
  });
  it("avistado é amarelo", () => {
    expect(occurrenceStyle("seen")).toMatchObject({ color: colors.seen, label: "Avistado" });
  });
  it("encontrado é verde", () => {
    expect(occurrenceStyle("found")).toMatchObject({ color: colors.found, label: "Encontrado" });
  });
  it("cada tipo tem uma cor diferente", () => {
    const cores = OCCURRENCE_TYPES.map((t) => occurrenceStyle(t).color);
    expect(new Set(cores).size).toBe(3);
  });
});

describe("etiqueta do tipo em cor sólida", () => {
  it("cada tipo tem uma cor de texto legível sobre a sua cor (contraste de pelo menos 3,5:1)", () => {
    for (const type of OCCURRENCE_TYPES) {
      const { color, textOn } = occurrenceStyle(type);
      expect({ type, ratio: contrastRatio(color, textOn) >= 3.5 }).toEqual({ type, ratio: true });
    }
  });

  it("branco sobre o vermelho do perdido; texto escuro sobre o amarelo e o verde", () => {
    expect(occurrenceStyle("lost").textOn).toBe(colors.white);
    expect(occurrenceStyle("seen").textOn).toBe(colors.foreground);
    expect(occurrenceStyle("found").textOn).toBe(colors.foreground);
  });

  it("contrastRatio segue a fórmula do WCAG", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 0);
    expect(contrastRatio("#F59E0B", "#FFFFFF")).toBeCloseTo(2.15, 1);
  });
});

describe("selo claro do tipo", () => {
  it("cada tipo tem um fundo claro próprio, com texto escuro legível e o ponto na cor do tipo", () => {
    for (const type of OCCURRENCE_TYPES) {
      const { soft, color } = occurrenceStyle(type);
      expect({ type, ok: contrastRatio(soft, colors.foreground) >= 7 }).toEqual({ type, ok: true });
      expect(soft).not.toBe(color);
    }
    expect(new Set(OCCURRENCE_TYPES.map((t) => occurrenceStyle(t).soft)).size).toBe(3);
  });
});

describe("botões (contraste AA)", () => {
  it("as variantes são marca (padrão), suave e contorno", () => {
    expect(BUTTON_VARIANTS).toEqual(["brand", "soft", "outline"]);
  });

  it("texto com contraste de pelo menos 4,5:1 no fundo normal, com o mouse em cima e pressionado", () => {
    for (const variant of BUTTON_VARIANTS) {
      const { background, hover, pressed, text } = buttonColors(variant);
      for (const surface of [background, hover, pressed]) {
        expect({ variant, surface, ok: contrastRatio(surface, text) >= 4.5 }).toEqual({ variant, surface, ok: true });
      }
    }
  });

  it("o botão principal é a cor da marca com texto branco, sem degradê", () => {
    expect(buttonColors("brand")).toEqual({ background: colors.brand, hover: colors.brandDeep, pressed: colors.brandDeep, text: colors.white });
  });

  it("toda variante tem tons diferentes para mouse em cima e pressionado", () => {
    for (const variant of BUTTON_VARIANTS) {
      const { background, hover, pressed } = buttonColors(variant);
      expect(hover).not.toBe(background);
      expect(pressed).not.toBe(background);
    }
  });
});

describe("withAlpha", () => {
  it("junta a opacidade ao hex (#RRGGBBAA)", () => {
    expect(withAlpha("#C4450A", 0)).toBe("#C4450A00");
    expect(withAlpha("#C4450A", 1)).toBe("#C4450AFF");
    expect(withAlpha("#2D6CDF", 0.12)).toBe("#2D6CDF1F");
  });

  it("recusa valor fora de 0..1 e hex que não seja #RRGGBB", () => {
    expect(() => withAlpha("#C4450A", 1.5)).toThrow();
    expect(() => withAlpha("#F80", 0.5)).toThrow();
  });
});

describe("sombras e sobreposição", () => {
  it("três níveis de elevação, do mais baixo ao mais alto, como boxShadow", () => {
    expect(Object.keys(elevation)).toEqual(["card", "raised", "floating"]);
    for (const level of Object.values(elevation)) expect(level.boxShadow).toMatch(/rgba\(31, 36, 48, 0\.\d+\)/);
  });

  it("sobreposição escura das fotos é a cor do texto com transparência", () => {
    expect(overlay.photo).toBe(withAlpha(colors.foreground, 0.35));
    expect(overlay.sheet).toBe(withAlpha(colors.foreground, 0.4));
  });
});
