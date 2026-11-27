import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react-native";
import { buttonColors, colors, type ButtonVariant } from "@miaucha/shared";

type Props = {
  title: string;
  onPress: () => void;
  /** `brand` (padrão): ação principal da tela. `soft`: ação de apoio. `outline`: ação neutra. */
  variant?: ButtonVariant;
  /** `sm` (40 px): ações dentro de cartões. O padrão tem 52 px. */
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  /** Ícone antes do texto. */
  icon?: ReactNode;
  /** Seta depois do texto (ações que levam ao próximo passo). */
  arrow?: boolean;
  className?: string;
};

/** Estado do Pressable; `hovered` só existe na web. */
type PressState = { pressed: boolean; hovered?: boolean };

/** O botão do app: sólido na cor da marca, sem degradê nem sombra. */
export function PrimaryButton({ title, onPress, variant = "brand", size = "md", disabled, loading, icon, arrow, className }: Props) {
  const c = buttonColors(variant);
  const inactive = !!(disabled || loading);
  const small = size === "sm";
  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: inactive, busy: !!loading }}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed, hovered }: PressState) => ({
          width: "100%",
          minHeight: small ? 40 : 52,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 12 : 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? c.pressed : hovered ? c.hover : c.background,
          borderWidth: 1,
          borderColor: variant === "outline" ? colors.border : "transparent",
          opacity: inactive && !loading ? 0.45 : 1,
        })}
      >
        {loading ? (
          <ActivityIndicator testID="button-loading" color={c.text} />
        ) : (
          <View className="flex-row items-center gap-2">
            {icon}
            <Text className={small ? "font-ui-bold text-sm" : "font-ui-bold text-base"} style={{ color: c.text }}>
              {title}
            </Text>
            {arrow ? (
              <View testID="button-arrow">
                <ArrowRight size={small ? 16 : 18} color={c.text} strokeWidth={2.4} />
              </View>
            ) : null}
          </View>
        )}
      </Pressable>
    </View>
  );
}
