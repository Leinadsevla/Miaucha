import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import { colors, elevation } from "@miaucha/shared";

/** Largura da coluna do app no navegador (celular grande). */
export const WEB_FRAME_WIDTH = 480;

/**
 * No navegador, o app fica numa coluna central com a largura de um celular grande, em vez de esticar
 * na tela toda. No aparelho, só repassa o conteúdo.
 */
export function WebFrame({ children, os = Platform.OS }: { children: ReactNode; os?: string }) {
  if (os !== "web") return <>{children}</>;
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: colors.muted }}>
      <View testID="web-frame" style={[{ flex: 1, width: "100%", maxWidth: WEB_FRAME_WIDTH, backgroundColor: colors.background, overflow: "hidden" }, elevation.floating]}>
        {children}
      </View>
    </View>
  );
}
