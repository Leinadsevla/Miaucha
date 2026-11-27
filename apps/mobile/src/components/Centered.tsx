import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

/** Conteúdo com largura máxima, centralizado: em telas largas não estica de ponta a ponta. */
export function Centered({ maxWidth, children, style, testID }: { maxWidth: number; children: ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <View testID={testID} style={[{ width: "100%", maxWidth, alignSelf: "center" }, style]}>
      {children}
    </View>
  );
}
