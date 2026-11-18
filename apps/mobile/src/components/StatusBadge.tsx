import { Text, View } from "react-native";
import { occurrenceStyle, type OccurrenceType } from "@miaucha/shared";

export function StatusBadge({ type }: { type: OccurrenceType }) {
  const { color, label } = occurrenceStyle(type);
  return (
    <View
      className="flex-row items-center self-start gap-1 rounded-full px-2 py-0.5"
      style={{ backgroundColor: `${color}1F` }}
    >
      <View testID="status-dot" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="font-nunito-bold text-xs" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
