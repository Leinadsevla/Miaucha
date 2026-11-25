import { colors, contrastRatio, occurrenceStyle, OCCURRENCE_TYPES } from "../theme";

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
