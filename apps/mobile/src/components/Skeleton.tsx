import { Animated, View, type DimensionValue } from "react-native";
import { colors, elevation } from "@miaucha/shared";
import { usePulse } from "@/lib/motion";

/** Bloco cinza que "respira" enquanto o conteúdo carrega (parado se o sistema pede menos movimento). */
export function Skeleton({ width = "100%", height = 14, radius = 8 }: { width?: DimensionValue; height?: number; radius?: number }) {
  const opacity = usePulse(0.45, 800);
  return <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: colors.muted, opacity }} />;
}

/** Lista de cartões em carregamento, no formato das linhas de Alertas, Chat e Perfil. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View accessible accessibilityLabel="Carregando" accessibilityRole="progressbar" className="gap-3">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} testID="skeleton-row" className="flex-row items-center gap-3 rounded-3xl border border-border bg-card p-3" style={elevation.card}>
          <Skeleton width={56} height={56} radius={16} />
          <View className="flex-1 gap-2">
            <Skeleton width="60%" />
            <Skeleton width="85%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}
