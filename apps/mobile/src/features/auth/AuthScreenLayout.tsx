import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Cabeçalho laranja com a pata, como na tela de login do design. */
export function AuthScreenLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
