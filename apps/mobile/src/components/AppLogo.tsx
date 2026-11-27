import { Image } from "expo-image";

// Símbolo da marca (gato + pin), com fundo transparente. Gerado de assets/logo-original.png.
const SYMBOL = require("../../assets/logo-symbol.png");

/** Logo do Miaucha. Use sempre este componente, nunca emoji ou ícone de pata no lugar da marca. */
export function AppLogo({ size = 48 }: { size?: number }) {
  return <Image accessibilityLabel="Logo do Miaucha" source={SYMBOL} contentFit="contain" style={{ width: size, height: size }} />;
}
