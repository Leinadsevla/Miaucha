import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { elevation } from "@miaucha/shared";
import { PrimaryButton } from "./PrimaryButton";

type Props = {
  icon: ReactNode;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** Estado vazio ou de erro: ícone num círculo suave, título, explicação e (opcional) uma ação. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: Props) {
  return (
    <View className="items-center rounded-3xl border border-border bg-card px-6 py-8" style={elevation.card}>
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-brand-soft">{icon}</View>
      <Text accessibilityRole="header" className="text-center font-ui-extrabold text-base text-foreground">
        {title}
      </Text>
      <Text className="mt-1.5 text-center font-sans text-sm leading-5 text-muted-foreground">{message}</Text>
      {actionLabel && onAction ? (
        <View className="mt-5 w-full">
          <PrimaryButton title={actionLabel} variant="outline" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
