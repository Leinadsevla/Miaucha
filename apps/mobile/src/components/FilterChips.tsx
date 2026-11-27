import { Pressable, ScrollView, Text } from "react-native";
import { colors } from "@miaucha/shared";

type Option<K extends string> = { key: K; label: string };

/** Fileira de filtros em pílula (alvo de 44 px). Selecionado: fundo suave da marca, borda e texto na cor da marca. */
export function FilterChips<K extends string>({ options, value, onChange }: { options: Option<K>[]; value: K; onChange: (key: K) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const selected = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.key)}
            hitSlop={4}
            style={({ pressed }) => ({
              minHeight: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              justifyContent: "center",
              borderWidth: 1,
              borderColor: selected ? colors.brandTint : colors.border,
              backgroundColor: selected ? colors.brandSoft : pressed ? colors.muted : colors.white,
            })}
          >
            <Text className={selected ? "font-ui-bold text-sm" : "font-ui-semibold text-sm"} style={{ color: selected ? colors.brandDeep : colors.foreground }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
