import { Pressable, ScrollView, Text } from "react-native";
import { colors, withAlpha } from "@miaucha/shared";

type Option<K extends string> = { key: K; label: string };

/**
 * Fileira de filtros em pílula, sobre a faixa laranja do cabeçalho (visual original). Selecionado: fundo
 * branco e texto laranja legível; os outros: branco translúcido com texto branco. Alvo de 40 px + `hitSlop`.
 */
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
            className="active:opacity-80"
            style={{
              minHeight: 40,
              paddingHorizontal: 16,
              borderRadius: 20,
              justifyContent: "center",
              backgroundColor: selected ? colors.white : withAlpha(colors.white, 0.2),
            }}
          >
            <Text className={selected ? "font-ui-bold text-sm" : "font-ui-semibold text-sm"} style={{ color: selected ? colors.brandDeep : colors.white }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
