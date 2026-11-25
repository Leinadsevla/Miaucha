import { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, occurrenceStyle } from "@miaucha/shared";
import { PrimaryButton, SectionLabel } from "@/components";
import { DEFAULT_MAP_FILTERS, PERIOD_OPTIONS, SPECIES_OPTIONS, TYPE_OPTIONS, type MapFilters } from "./filters";

type Props = {
  visible: boolean;
  filters: MapFilters;
  onApply: (filters: MapFilters) => void;
  onClose: () => void;
};

function Chip({ label, selected, color = colors.primary, onPress }: { label: string; selected: boolean; color?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="rounded-full border-2 px-4 py-2"
      style={{ borderColor: selected ? color : colors.border, backgroundColor: selected ? `${color}1F` : colors.card }}
    >
      <Text className="font-nunito-bold text-sm" style={{ color: selected ? color : colors.mutedForeground }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** MP-05: filtros do mapa num painel que sobe de baixo. Só valem ao tocar em "Aplicar filtros". */
export function MapFiltersSheet({ visible, filters, onApply, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);

  // Ao abrir, começa do que está valendo (fechar sem aplicar descarta as mudanças).
  useEffect(() => {
    if (visible) setDraft(filters);
  }, [visible, filters]);

  const set = <K extends keyof MapFilters>(key: K, value: MapFilters[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0, 0, 0, 0.35)" }}>
        <Pressable accessibilityLabel="Fechar filtros" className="flex-1" onPress={onClose} />
        <View className="gap-4 rounded-t-3xl bg-white px-5 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <View className="flex-row items-center justify-between">
            <Text accessibilityRole="header" className="font-nunito-black text-lg text-foreground">
              Filtros
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar filtros" onPress={onClose} hitSlop={12}>
              <X size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <View>
            <SectionLabel>Tipo</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {TYPE_OPTIONS.map(({ value, label }) => (
                <Chip
                  key={value}
                  label={label}
                  selected={draft.type === value}
                  color={value === "all" ? colors.primary : occurrenceStyle(value).color}
                  onPress={() => set("type", value)}
                />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel>Espécie</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {SPECIES_OPTIONS.map(({ value, label }) => (
                <Chip key={value} label={label} selected={draft.species === value} onPress={() => set("species", value)} />
              ))}
            </View>
          </View>

          <View>
            <SectionLabel>Registradas nas últimas</SectionLabel>
            <View className="flex-row flex-wrap gap-2">
              {PERIOD_OPTIONS.map(({ days, label }) => (
                <Chip key={days} label={label} selected={draft.sinceDays === days} onPress={() => set("sinceDays", days)} />
              ))}
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <PrimaryButton title="Limpar" variant="outline" onPress={() => setDraft(DEFAULT_MAP_FILTERS)} />
            </View>
            <View className="flex-[2]">
              <PrimaryButton title="Aplicar filtros" variant="primary" onPress={() => onApply(draft)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
