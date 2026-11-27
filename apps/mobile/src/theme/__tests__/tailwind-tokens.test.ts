import { colors, fonts } from "@miaucha/shared";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require("../../../tailwind.config.js");

describe("tailwind.config usa os tokens do packages/shared", () => {
  const twColors = tailwind.theme.extend.colors;

  it.each(Object.entries(colors))("%s", (name, hex) => {
    const key = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(twColors[key]).toBe(hex);
  });

  it("não sobra cor no Tailwind que não exista nos tokens", () => {
    const keys = Object.keys(colors).map((name) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
    expect(Object.keys(twColors).sort()).toEqual(keys.sort());
  });

  it("fonte Plus Jakarta Sans: `font-sans` é o peso normal e cada peso tem a sua classe `font-ui-*`", () => {
    expect(tailwind.theme.extend.fontFamily).toEqual({
      sans: [fonts.regular],
      "ui-medium": [fonts.medium],
      "ui-semibold": [fonts.semibold],
      "ui-bold": [fonts.bold],
      "ui-extrabold": [fonts.extrabold],
    });
  });
});
