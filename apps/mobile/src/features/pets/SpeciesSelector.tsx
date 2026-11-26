import { Pressable, Text, View } from "react-native";
import { OTHER_SPECIES, colors, speciesLabel, type Species } from "@miaucha/shared";
import { SpeciesIcon } from "@/components";
import { cn } from "@/lib/cn";

type Main = "dog" | "cat" | "others";

const MAIN: { value: Main; label: string; icon: Species }[] = [
  { value: "dog", label: "Cão", icon: "dog" },
  { value: "cat", label: "Gato", icon: "cat" },
  { value: "others", label: "Outros", icon: "other" },
];

const isOther = (s: Species) => s !== "dog" && s !== "cat";

/** TIPO DE ANIMAL: Cão, Gato ou Outros (pássaro, coelho, roedor, réptil, outro animal). */
export function SpeciesSelector({ value, onChange, error }: { value: Species; onChange: (species: Species) => void; error?: string }) {
  const main: Main = isOther(value) ? "others" : (value as Main);

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {MAIN.map((option) => {
          const selected = main === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityLabel={option.label}
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value === "others" ? (isOther(value) ? value : "other") : option.value)}
              className={cn(
                "flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-2",
                selected ? "border-brand bg-brand-soft" : "border-border bg-white",
              )}
              style={{ minHeight: 52 }}
            >
              <SpeciesIcon species={option.icon} size={20} color={selected ? colors.brand : colors.mutedForeground} />
              <Text className={cn("text-sm", selected ? "font-ui-extrabold text-foreground" : "font-ui-bold text-muted-foreground")}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {main === "others" ? (
        <View className="flex-row flex-wrap gap-2">
          {OTHER_SPECIES.map((species) => {
            const selected = value === species;
            return (
              <Pressable
                key={species}
                accessibilityRole="button"
                accessibilityLabel={speciesLabel(species)}
                accessibilityState={{ selected }}
                onPress={() => onChange(species)}
                className={cn("flex-row items-center gap-1.5 rounded-full border-2 px-4", selected ? "border-brand bg-brand-soft" : "border-border bg-white")}
                style={{ minHeight: 44 }}
              >
                <SpeciesIcon species={species} size={16} color={selected ? colors.brand : colors.mutedForeground} />
                <Text className={cn("text-sm", selected ? "font-ui-extrabold text-foreground" : "font-ui-bold text-muted-foreground")}>{speciesLabel(species)}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text className="font-ui-semibold text-xs text-lost">{error}</Text> : null}
    </View>
  );
}
