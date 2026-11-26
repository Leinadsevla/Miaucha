import { layoutFor, SIDE_NAV_WIDTH, WIDE_BREAKPOINT } from "../layout";

describe("layoutFor (responsivo)", () => {
  it("celular: barra de abas embaixo e 2 colunas de pets", () => {
    expect(layoutFor(390)).toEqual({ wide: false, petColumns: 2, contentWidth: 390 });
  });

  it("tablet em pé (768): ainda layout de celular, com 3 colunas", () => {
    expect(layoutFor(768)).toMatchObject({ wide: false, petColumns: 3 });
  });

  it(`a partir de ${WIDE_BREAKPOINT} px: menu lateral, e a largura útil desconta o menu`, () => {
    const l = layoutFor(1024);
    expect(l.wide).toBe(true);
    expect(l.contentWidth).toBe(1024 - SIDE_NAV_WIDTH);
    expect(l.petColumns).toBe(3);
  });

  it("monitor grande: 4 colunas, nunca mais", () => {
    expect(layoutFor(1440).petColumns).toBe(4);
    expect(layoutFor(2560).petColumns).toBe(4);
  });

  it("tela muito estreita continua com 2 colunas", () => {
    expect(layoutFor(320).petColumns).toBe(2);
  });
});
