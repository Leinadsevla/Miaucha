import { colors, occurrenceStyle, OCCURRENCE_TYPES } from "../theme";

describe("tokens do design", () => {
  it("usa as cores do protótipo", () => {
    expect(colors.primary).toBe("#FF8A3D");
    expect(colors.accent).toBe("#2D6CDF");
    expect(colors.hope).toBe("#FFD447");
  });
});

describe("occurrenceStyle (MP-01)", () => {
  it("perdido é vermelho", () => {
    expect(occurrenceStyle("lost")).toEqual({ color: colors.lost, label: "Perdido" });
  });
  it("avistado é amarelo", () => {
    expect(occurrenceStyle("seen")).toEqual({ color: colors.seen, label: "Avistado" });
  });
  it("encontrado é verde", () => {
    expect(occurrenceStyle("found")).toEqual({ color: colors.found, label: "Encontrado" });
  });
  it("cada tipo tem uma cor diferente", () => {
    const cores = OCCURRENCE_TYPES.map((t) => occurrenceStyle(t).color);
    expect(new Set(cores).size).toBe(3);
  });
});
