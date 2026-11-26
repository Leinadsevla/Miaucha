import { Pressable, ScrollView, Text } from "react-native";
import { colors } from "@miaucha/shared";

type Option<K extends string> = { key: K; label: string };

/** Fileira de filtros em pílula (alvo de 44 px). Selecionado: fundo escuro e texto branco (contraste AA). */
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
              backgroundColor: selected ? colors.foreground : pressed ? colors.border : colors.muted,
            })}
          >
            <Text className="font-nunito-bold text-sm" style={{ color: selected ? colors.white : colors.foreground }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
