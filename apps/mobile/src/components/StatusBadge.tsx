import { Animated, Text, View } from "react-native";
import { AlertTriangle, Eye, HandHeart } from "lucide-react-native";
import { occurrenceStyle, type OccurrenceType } from "@miaucha/shared";
import { usePulse } from "@/lib/motion";

const ICONS = { lost: AlertTriangle, seen: Eye, found: HandHeart } as const;

/** Tipo da ocorrência em destaque: fundo sólido na cor do tipo, ícone e texto em caixa alta (cor legível por tipo). */
export function StatusBadge({ type, size = "md" }: { type: OccurrenceType; size?: "md" | "lg" }) {
  const { color, label, textOn } = occurrenceStyle(type);
  const Icon = ICONS[type];
  const large = size === "lg";
  return (
    <View
      testID="status-badge"
      className={large ? "flex-row items-center self-start gap-1.5 rounded-xl px-3 py-1.5" : "flex-row items-center self-start gap-1 rounded-lg px-2 py-1"}
      style={{ backgroundColor: color }}
    >
      {large && type === "lost" ? <PulseDot color={textOn} /> : <Icon size={large ? 14 : 12} color={textOn} />}
      <Text className={large ? "font-nunito-black text-sm uppercase" : "font-nunito-black text-xs uppercase"} style={{ color: textOn }}>
        {label}
      </Text>
    </View>
  );
}

/** Ponto que pulsa no selo grande de "Perdido": o caso está ativo (parado com menos movimento). */
function PulseDot({ color }: { color: string }) {
  const opacity = usePulse(0.25, 700);
  return <Animated.View testID="status-pulse" style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, opacity }} />;
}
