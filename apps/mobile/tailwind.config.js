// Cores e fontes espelham packages/shared/src/theme.ts.
// O teste src/theme/__tests__/tailwind-tokens.test.ts garante que os dois continuem iguais.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // O app é só claro. Com o padrão ("media"), o NativeWind quebra na web em desenvolvimento
  // ("Cannot manually set color scheme") quando o CSS carrega depois do JavaScript.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "#C4450A",
        "brand-deep": "#9E3607",
        "brand-soft": "#FFF1E7",
        "brand-tint": "#FFE1CC",
        cream: "#FFF8F2",
        accent: "#2D6CDF",
        "accent-deep": "#2257BD",
        "accent-soft": "#EAF1FD",
        hope: "#FFD447",
        lost: "#EF4444",
        "lost-deep": "#C52222",
        seen: "#F59E0B",
        found: "#22C55E",
        "lost-soft": "#FDECEC",
        "seen-soft": "#FEF3D7",
        "found-soft": "#E4F7EB",
        background: "#F8F8FA",
        card: "#FFFFFF",
        foreground: "#1F2430",
        "ink-deep": "#12151D",
        muted: "#F1F1F4",
        "muted-foreground": "#626978",
        border: "#E7E7EC",
        input: "#F3F3F6",
        white: "#FFFFFF",
      },
      // Plus Jakarta Sans (nomes do pacote @expo-google-fonts/plus-jakarta-sans).
      fontFamily: {
        sans: ["PlusJakartaSans_400Regular"],
        "ui-medium": ["PlusJakartaSans_500Medium"],
        "ui-semibold": ["PlusJakartaSans_600SemiBold"],
        "ui-bold": ["PlusJakartaSans_700Bold"],
        "ui-extrabold": ["PlusJakartaSans_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
