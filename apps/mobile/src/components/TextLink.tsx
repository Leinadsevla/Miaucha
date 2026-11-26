import { Pressable, Text } from "react-native";

/** Link de texto com alvo de toque de 44 px. */
export function TextLink({ label, onPress, disabled, tone = "muted" }: { label: string; onPress: () => void; disabled?: boolean; tone?: "muted" | "brand" }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.5 : pressed ? 0.6 : 1 })}
    >
      <Text className={tone === "brand" ? "font-ui-bold text-sm text-brand" : "font-ui-semibold text-sm text-muted-foreground"}>{label}</Text>
    </Pressable>
  );
}

