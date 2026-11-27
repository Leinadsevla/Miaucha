import { Animated, Text, View } from "react-native";
import { colors, occurrenceStyle, type OccurrenceType } from "@miaucha/shared";
import { usePulse } from "@/lib/motion";

/** Tipo da ocorrência num selo claro: ponto na cor do tipo e texto escuro. A cor sólida fica para o mapa (MP-01). */
export function StatusBadge({ type, size = "md" }: { type: OccurrenceType; size?: "md" | "lg" }) {
  const { color, label, soft } = occurrenceStyle(type);
  const large = size === "lg";
  const dot = large ? 8 : 6;
  return (
    <View
      testID="status-badge"
      className={large ? "flex-row items-center self-start gap-2 rounded-full px-3 py-1.5" : "flex-row items-center self-start gap-1.5 rounded-full px-2.5 py-1"}
      style={{ backgroundColor: soft }}
    >
      {large && type === "lost" ? (
        <PulseDot color={color} size={dot} />
      ) : (
        <View testID="status-dot" style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
      )}
      <Text className={large ? "font-ui-bold text-sm" : "font-ui-bold text-xs"} style={{ color: colors.foreground }}>
        {label}
      </Text>
    </View>
  );
}

/** Ponto que pulsa no selo grande de "Perdido": o caso está ativo (parado com menos movimento). */
function PulseDot({ color, size }: { color: string; size: number }) {
  const opacity = usePulse(0.3, 700);
  return <Animated.View testID="status-pulse" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity }} />;
}
