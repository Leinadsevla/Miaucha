import type { ReactNode } from "react";
import { Pressable } from "react-native";
import { colors, withAlpha } from "@miaucha/shared";

type Tone = "muted" | "white" | "overlay" | "accent";

const TONES: Record<Tone, { background: string; pressed: string }> = {
  muted: { background: colors.muted, pressed: colors.border },
  white: { background: colors.white, pressed: colors.muted },
  overlay: { background: withAlpha(colors.foreground, 0.35), pressed: withAlpha(colors.foreground, 0.5) },
  accent: { background: colors.accent, pressed: colors.accentDeep },
};

type Props = {
  /** Nome lido pelo leitor de tela (o botão só tem ícone). */
  label: string;
  icon: ReactNode;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  testID?: string;
};

/** Botão só com ícone: alvo de 44 px (mínimo de toque), tom pressionado e estado desabilitado visível. */
export function IconButton({ label, icon, onPress, tone = "muted", disabled = false, testID }: Props) {
  const t = TONES[tone];
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed ? t.pressed : t.background,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      {icon}
    </Pressable>
  );
}
