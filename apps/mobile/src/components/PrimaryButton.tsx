import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { buttonColors, elevation, type ButtonVariant } from "@miaucha/shared";

type Props = {
  title: string;
  onPress: () => void;
  /** `ink` (grafite): ação principal. `primary` (laranja, texto escuro): destaque da marca. `outline`: secundária. */
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

/** Estado do Pressable; `hovered` e `focused` só existem na web. */
type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

export function PrimaryButton({ title, onPress, variant = "ink", disabled, loading, icon, className }: Props) {
  const c = buttonColors(variant);
  const inactive = !!(disabled || loading);
  const outline = variant === "outline";
  return (
    <View className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: inactive, busy: !!loading }}
        disabled={inactive}
        onPress={onPress}
        style={({ pressed, hovered }: PressState) => [
          {
            width: "100%",
            minHeight: 54,
            paddingHorizontal: 22,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? c.pressed : hovered ? c.hover : c.background,
            borderWidth: outline ? 1.5 : 0,
            borderColor: c.pressed,
            opacity: inactive && !loading ? 0.45 : 1,
            transform: [{ translateY: hovered && !pressed ? -1 : 0 }, { scale: pressed ? 0.985 : 1 }],
          },
          // Sombra: nenhuma no contorno e no desabilitado; mais alta com o mouse em cima.
          outline || inactive ? null : hovered && !pressed ? elevation.floating : elevation.raised,
        ]}
      >
        {loading ? (
          <ActivityIndicator testID="button-loading" color={c.text} />
        ) : (
          <View className="flex-row items-center gap-2.5">
            {icon}
            <Text className="font-nunito-black text-base tracking-wide" style={{ color: c.text }}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
