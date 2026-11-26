import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation } from "@miaucha/shared";
import { AppLogo, KeyboardScreen } from "@/components";

/** Telas de entrada: cabeçalho laranja em degradê com a logo e o formulário num cartão sobreposto. */
export function AuthScreenLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardScreen contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ alignItems: "center", gap: 16, paddingHorizontal: 24, paddingTop: insets.top + 28, paddingBottom: 56 }}
      >
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white" style={elevation.floating}>
          <AppLogo size={56} />
        </View>
        <View className="items-center">
          <Text accessibilityRole="header" className="text-center font-nunito-black text-[28px] leading-9 text-white">
            {title}
          </Text>
          <Text className="mt-1 text-center font-nunito-semibold text-base text-white">{subtitle}</Text>
        </View>
      </LinearGradient>
      <View className="-mt-8 mx-4 rounded-3xl border border-border bg-card p-5" style={elevation.raised}>
        {children}
      </View>
    </KeyboardScreen>
  );
}
