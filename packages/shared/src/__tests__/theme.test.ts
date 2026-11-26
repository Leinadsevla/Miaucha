import { buttonColors, BUTTON_VARIANTS, colors, contrastRatio, elevation, occurrenceStyle, OCCURRENCE_TYPES, overlay, withAlpha } from "../theme";

describe("tokens do design", () => {
  it("usa as cores do protótipo", () => {
    expect(colors.primary).toBe("#FF8A3D");
    expect(colors.accent).toBe("#2D6CDF");
    expect(colors.hope).toBe("#FFD447");
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

describe("botões (contraste AA)", () => {
  it("o texto de cada variante tem contraste de pelo menos 4,5:1 com o fundo", () => {
    for (const variant of BUTTON_VARIANTS) {
      const { background, text } = buttonColors(variant);
      expect({ variant, ok: contrastRatio(background, text) >= 4.5 }).toEqual({ variant, ok: true });
    }
  });

  it("o laranja da marca leva texto escuro (branco nele fica em 2,3:1)", () => {
    expect(buttonColors("primary")).toMatchObject({ background: colors.primary, pressed: colors.primaryDeep, text: colors.foreground });
    expect(buttonColors("accent").text).toBe(colors.white);
  });

  it("o botão principal é grafite (cor do texto do app) com texto branco, e é a primeira variante", () => {
    expect(BUTTON_VARIANTS[0]).toBe("ink");
    expect(buttonColors("ink")).toEqual({ background: colors.foreground, hover: colors.inkSoft, pressed: colors.inkDeep, text: colors.white });
  });

  it("toda variante tem um tom para o mouse em cima, diferente do normal", () => {
    for (const variant of BUTTON_VARIANTS) {
      const { background, hover } = buttonColors(variant);
      expect(hover).not.toBe(background);
    }
  });

  it("o tom pressionado é diferente do normal", () => {
    for (const variant of BUTTON_VARIANTS) {
      const { background, pressed } = buttonColors(variant);
      expect(pressed).not.toBe(background);
    }
  });
});

describe("withAlpha", () => {
  it("junta a opacidade ao hex (#RRGGBBAA)", () => {
    expect(withAlpha("#FF8A3D", 0)).toBe("#FF8A3D00");
    expect(withAlpha("#FF8A3D", 1)).toBe("#FF8A3DFF");
    expect(withAlpha("#2D6CDF", 0.12)).toBe("#2D6CDF1F");
  });

  it("recusa valor fora de 0..1 e hex que não seja #RRGGBB", () => {
    expect(() => withAlpha("#FF8A3D", 1.5)).toThrow();
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
