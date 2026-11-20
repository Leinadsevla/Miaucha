import { Pressable, Text, View } from "react-native";
import { colors, type Species } from "@miaucha/shared";
import { SpeciesIcon } from "@/components";
import { cn } from "@/lib/cn";

const SPECIES: { value: Species; label: string }[] = [
  { value: "dog", label: "Cão" },
  { value: "cat", label: "Gato" },
];

/** Botões Cão / Gato do design (TIPO DE ANIMAL). */
export function SpeciesSelector({ value, onChange, error }: { value: Species; onChange: (species: Species) => void; error?: string }) {
  return (
    <View>
      <View className="flex-row gap-3">
        {SPECIES.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-2 py-3",
                selected ? "border-primary bg-primary" : "border-border",
              )}
            >
              <SpeciesIcon species={option.value} size={18} color={selected ? colors.white : colors.mutedForeground} />
              <Text className={cn("font-nunito-bold text-sm", selected ? "text-white" : "text-muted-foreground")}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{error}</Text> : null}
    </View>
  );
}
