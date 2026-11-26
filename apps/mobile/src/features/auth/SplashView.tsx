import { useEffect } from "react";
import { Animated, Text, View } from "react-native";
import { colors } from "@miaucha/shared";
import { AppLogo } from "@/components";
import { usePulse } from "@/lib/motion";

export const SPLASH_DURATION_MS = 2600;

/** Pontinho de carregamento que pulsa (parado se o sistema pede menos movimento). */
function LoadingDot({ duration }: { duration: number }) {
  const opacity = usePulse(0.3, duration);
  return <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, opacity }} />;
}

export function SplashView({ onFinish, version = "1.0.0" }: { onFinish: () => void; version?: string }) {
  useEffect(() => {
    const t = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <View className="items-center gap-5">
        <AppLogo size={96} />
        <View className="items-center">
          <Text className="font-ui-extrabold text-[40px] leading-[48px] tracking-tight text-foreground">Miaucha</Text>
          <Text className="mt-1 font-ui-medium text-base text-muted-foreground">Conectando pets aos seus lares</Text>
        </View>
        <View accessible accessibilityLabel="Carregando" className="mt-2 flex-row gap-2">
          <LoadingDot duration={500} />
          <LoadingDot duration={650} />
          <LoadingDot duration={800} />
        </View>
      </View>
      <Text className="absolute bottom-10 font-sans text-xs text-muted-foreground">Versão {version} • TCC 2026</Text>
    </View>
  );
}
