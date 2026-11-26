import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { buttonColors, elevation, type ButtonVariant } from "@miaucha/shared";

type Props = {
  title: string;
  onPress: () => void;
  /** `accent` (azul): ação principal. `primary` (laranja, texto escuro): destaque da marca. */
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function PrimaryButton({ title, onPress, variant = "accent", disabled, loading, icon, className }: Props) {
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
        style={({ pressed }) => [
          {
            width: "100%",
            minHeight: 52,
            paddingHorizontal: 20,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: pressed ? c.pressed : c.background,
            borderWidth: outline ? 1 : 0,
            borderColor: c.pressed,
            opacity: inactive && !loading ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
          outline || inactive ? null : elevation.card,
        ]}
      >
        {loading ? (
          <ActivityIndicator testID="button-loading" color={c.text} />
        ) : (
          <View className="flex-row items-center gap-2">
            {icon}
            <Text className="font-nunito-bold text-base" style={{ color: c.text }}>
              {title}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
