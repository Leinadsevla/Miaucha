import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { colors } from "@miaucha/shared";
import { cn } from "@/lib/cn";

type Variant = "accent" | "primary" | "outline";

const VARIANTS: Record<Variant, { box: string; text: string; spinner: string }> = {
  accent: { box: "bg-accent", text: "text-white", spinner: colors.white },
  primary: { box: "bg-primary", text: "text-white", spinner: colors.white },
  outline: { box: "bg-white border border-border", text: "text-foreground", spinner: colors.foreground },
};

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  className?: string;
};

export function PrimaryButton({ title, onPress, variant = "accent", disabled, loading, icon, className }: Props) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      className={cn(
        "w-full flex-row items-center justify-center gap-2 rounded-2xl py-4 active:opacity-80",
        v.box,
        inactive && "opacity-50",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator testID="button-loading" color={v.spinner} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <Text className={cn("font-nunito-bold text-base", v.text)}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}
