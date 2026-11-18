// Cores e fontes espelham packages/shared/src/theme.ts.
// O teste src/theme/__tests__/tailwind-tokens.test.ts garante que os dois continuem iguais.
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#FF8A3D",
        "primary-soft": "#FFF1E7",
        accent: "#2D6CDF",
        hope: "#FFD447",
        lost: "#EF4444",
        seen: "#F59E0B",
        found: "#22C55E",
        background: "#F7F7F9",
        card: "#FFFFFF",
        foreground: "#1F2430",
        muted: "#F1F1F4",
        "muted-foreground": "#6B7280",
        border: "#E7E7EC",
        input: "#F3F3F6",
        white: "#FFFFFF",
      },
      fontFamily: {
        sans: ["Nunito_400Regular"],
        "nunito-semibold": ["Nunito_600SemiBold"],
        "nunito-bold": ["Nunito_700Bold"],
        "nunito-black": ["Nunito_900Black"],
      },
    },
  },
  plugins: [],
};
