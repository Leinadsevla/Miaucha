import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { KeyboardScreen } from "@/components";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Cabeçalho laranja com a pata, como na tela de login do design. */
export function AuthScreenLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardScreen contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <View className="items-center gap-4 bg-primary px-6 pb-8" style={{ paddingTop: insets.top + 24 }}>
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Text className="text-3xl">🐾</Text>
          </View>
          <View className="items-center">
            <Text className="text-center font-nunito-black text-2xl text-white">{title}</Text>
            <Text className="mt-1 text-center font-sans text-sm text-white/70">{subtitle}</Text>
          </View>
        </View>
        <View className="px-5 pt-5">{children}</View>
    </KeyboardScreen>
  );
}
