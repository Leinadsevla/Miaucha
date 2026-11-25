import type { ReactNode } from "react";
import { KeyboardAvoidingView, ScrollView, type ScrollViewProps } from "react-native";

/**
 * Tela rolável que sobe o conteúdo acima do teclado. `padding` nas duas plataformas: no Android o app é
 * edge-to-edge e a janela não encolhe com o teclado, então sem `behavior` o teclado cobre os campos.
 */
export const KEYBOARD_AVOIDING_BEHAVIOR = "padding" as const;

export function KeyboardScreen({
  children,
  className = "flex-1 bg-background",
  contentContainerStyle,
}: {
  children: ReactNode;
  className?: string;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
}) {
  return (
    <KeyboardAvoidingView className={className} behavior={KEYBOARD_AVOIDING_BEHAVIOR}>
      <ScrollView testID="keyboard-screen-scroll" contentContainerStyle={contentContainerStyle} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
