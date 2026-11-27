import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@miaucha/shared";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

type Props = {
  title: string;
  /** Linha pequena acima do título (ex.: "Olá, Ana"). */
  eyebrow?: string;
  subtitle?: string;
  /** Botões à direita do título. */
  right?: ReactNode;
  /** Conteúdo abaixo do título (busca, filtros). */
  children?: ReactNode;
  /** Largura máxima do conteúdo (a faixa ocupa a tela toda). */
  maxWidth?: number;
};

/** Cabeçalho das abas (visual original): faixa laranja da marca com o título em branco. */
export function TabHeader({ title, eyebrow, subtitle, right, children, maxWidth = READING_MAX_WIDTH - 40 }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View testID="tab-header" className="px-5 pb-6" style={{ paddingTop: insets.top + 20, backgroundColor: colors.brand }}>
      <View style={centered(maxWidth)}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            {eyebrow ? <Text className="mb-0.5 font-ui-semibold text-sm text-white/80">{eyebrow}</Text> : null}
            <Text accessibilityRole="header" className="font-ui-extrabold text-2xl" style={{ color: colors.white }}>
              {title}
            </Text>
            {subtitle ? <Text className="mt-0.5 font-sans text-sm text-white/80">{subtitle}</Text> : null}
          </View>
          {right}
        </View>
        {children ? <View className="mt-4">{children}</View> : null}
      </View>
    </View>
  );
}
