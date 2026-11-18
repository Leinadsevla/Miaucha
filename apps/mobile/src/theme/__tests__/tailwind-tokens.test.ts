import { colors } from "@miaucha/shared";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwind = require("../../../tailwind.config.js");

describe("tailwind.config usa os tokens do packages/shared", () => {
  const twColors = tailwind.theme.extend.colors;

  it.each(Object.entries(colors))("%s", (name, hex) => {
    const key = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    expect(twColors[key]).toBe(hex);
  });

  it("fonte Nunito", () => {
    expect(tailwind.theme.extend.fontFamily.sans).toEqual(["Nunito_400Regular"]);
    expect(tailwind.theme.extend.fontFamily["nunito-black"]).toEqual(["Nunito_900Black"]);
  });
});
