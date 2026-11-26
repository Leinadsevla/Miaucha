import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";

type Props = {
  title: string;
  /** Linha pequena acima do título (ex.: "Olá, Ana"). */
  eyebrow?: string;
  /** Botões à direita do título. */
  right?: ReactNode;
  /** Conteúdo abaixo do título (chips, avatar, contadores). */
  children?: ReactNode;
};

/** Cabeçalho laranja das abas, com degradê sutil da marca e cantos de baixo arredondados. */
export function GradientHeader({ title, eyebrow, right, children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          {eyebrow ? <Text className="font-nunito-semibold text-sm text-white">{eyebrow}</Text> : null}
          <Text accessibilityRole="header" className="mt-0.5 font-nunito-black text-2xl text-white">
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children ? <View className="mt-4">{children}</View> : null}
    </LinearGradient>
  );
}
