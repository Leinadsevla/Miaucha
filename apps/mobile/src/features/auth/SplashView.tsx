import { useEffect } from "react";
import { Text, View } from "react-native";
import { AppLogo } from "@/components";

export const SPLASH_DURATION_MS = 2600;

export function SplashView({ onFinish, version = "1.0.0" }: { onFinish: () => void; version?: string }) {
  useEffect(() => {
    const t = setTimeout(onFinish, SPLASH_DURATION_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <View className="items-center gap-5">
        <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white shadow-xl">
          <AppLogo size={72} />
        </View>
        <View className="items-center">
          <Text className="font-nunito-black text-4xl text-white">Miaucha</Text>
          <Text className="mt-1 font-nunito-semibold text-sm text-white/70">Conectando pets aos seus lares</Text>
        </View>
      </View>
      <Text className="absolute bottom-10 font-sans text-xs text-white/50">Versão {version} • TCC 2026</Text>
    </View>
  );
}
