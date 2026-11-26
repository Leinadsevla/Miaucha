import { useEffect } from "react";
import { Animated, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, elevation } from "@miaucha/shared";
import { AppLogo } from "@/components";
import { usePulse } from "@/lib/motion";

export const SPLASH_DURATION_MS = 2600;

/** Pontinho de carregamento que pulsa (parado se o sistema pede menos movimento). */
function LoadingDot({ duration }: { duration: number }) {
  const opacity = usePulse(0.3, duration);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white, opacity }} />;
}

export function SplashView({ onFinish, version = "1.0.0" }: { onFinish: () => void; version?: string }) {
  useEffect(() => {
    const t = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <LinearGradient colors={[colors.primary, colors.primaryDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <View className="items-center gap-6">
        <View className="h-28 w-28 items-center justify-center rounded-[32px] bg-white" style={elevation.floating}>
          <AppLogo size={80} />
        </View>
        <View className="items-center">
          <Text className="font-nunito-black text-[40px] leading-[48px] text-white">Miaucha</Text>
          <Text className="mt-1 font-nunito-semibold text-base text-white">Conectando pets aos seus lares</Text>
        </View>
        <View accessible accessibilityLabel="Carregando" className="mt-2 flex-row gap-2">
          <LoadingDot duration={500} />
          <LoadingDot duration={650} />
          <LoadingDot duration={800} />
        </View>
      </View>
      <Text className="absolute bottom-10 font-sans text-xs text-white">Versão {version} • TCC 2026</Text>
    </LinearGradient>
  );
}
