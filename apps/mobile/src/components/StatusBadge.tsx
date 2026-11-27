import { Text, View } from "react-native";
import { AlertTriangle, Eye, HandHeart } from "lucide-react-native";
import { occurrenceStyle, type OccurrenceType } from "@miaucha/shared";

const ICONS = { lost: AlertTriangle, seen: Eye, found: HandHeart } as const;

/** Tipo da ocorrência em destaque (visual original): fundo sólido na cor do tipo, ícone e texto em caixa alta. */
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
      <Icon size={large ? 14 : 12} color={textOn} />
      <Text className={large ? "font-ui-extrabold text-sm uppercase" : "font-ui-extrabold text-xs uppercase"} style={{ color: textOn }}>
        {label}
      </Text>
    </View>
  );
}
