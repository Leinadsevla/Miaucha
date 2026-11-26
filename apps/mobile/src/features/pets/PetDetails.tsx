import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AlertTriangle, Cake, ChevronLeft, Palette, PawPrint, Pencil } from "lucide-react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, speciesLabel, withAlpha, type MyPet } from "@miaucha/shared";
import { Card, IconButton, PhotoCarousel, PrimaryButton, SpeciesIcon } from "@/components";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

const PHOTO_HEIGHT = 320;
const NOT_INFORMED = "Não informado";

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <Card className="w-[48%] gap-1 p-3.5">
      <View className="mb-1 h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">{icon}</View>
      <Text className="font-sans text-xs text-muted-foreground">{label}</Text>
      <Text className="font-nunito-bold text-sm text-foreground">{value || NOT_INFORMED}</Text>
    </Card>
  );
}

/**
 * Detalhes do pet para o tutor: galeria de fotos (deslize para o lado) e informações do cadastro.
 * `onEdit` abre a edição; `onReportLost` abre o registro de ocorrência já preenchido com este pet.
 */
export function PetDetails({
  pet,
  onBack,
  onEdit,
  onReportLost,
}: {
  pet: MyPet;
  onBack: () => void;
  onEdit?: () => void;
  onReportLost?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const subtitle = [pet.breed, pet.color].filter(Boolean).join(" · ");

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ ...centered(READING_MAX_WIDTH), paddingBottom: insets.bottom + 24 }}>
      <View style={{ height: PHOTO_HEIGHT }} className="bg-muted">
        {pet.photos.length > 0 ? (
          <PhotoCarousel urls={pet.photos.map((p) => p.url)} label={pet.name} height={PHOTO_HEIGHT} />
        ) : (
          <View accessibilityLabel={`${pet.name} ainda não tem foto`} className="flex-1 items-center bg-primary-soft" style={{ paddingTop: 72 }}>
            <SpeciesIcon species={pet.species} size={96} color={colors.primaryDeep} />
          </View>
        )}

        <LinearGradient
          pointerEvents="none"
          colors={[withAlpha(colors.foreground, 0), withAlpha(colors.foreground, 0.8)]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 48 }}
        >
          <Text accessibilityRole="header" className="font-nunito-black text-[28px] leading-9 text-white">
            {pet.name}
          </Text>
          {subtitle ? <Text className="font-nunito-semibold text-sm text-white">{subtitle}</Text> : null}
        </LinearGradient>

        <View className="absolute left-4" style={{ top: insets.top + 12 }}>
          <IconButton label="Voltar" tone="overlay" icon={<ChevronLeft size={22} color={colors.white} />} onPress={onBack} />
        </View>
        {onEdit ? (
          <View className="absolute right-4" style={{ top: insets.top + 12 }}>
            <IconButton label={`Editar ${pet.name}`} tone="overlay" icon={<Pencil size={19} color={colors.white} />} onPress={onEdit} />
          </View>
        ) : null}
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-3 px-5 pt-5">
        <Info
          icon={<SpeciesIcon species={pet.species} size={18} color={colors.primaryDeep} />}
          label="Espécie"
          value={speciesLabel(pet.species)}
        />
        <Info icon={<PawPrint size={18} color={colors.primaryDeep} />} label="Raça" value={pet.breed} />
        <Info icon={<Palette size={18} color={colors.primaryDeep} />} label="Cor" value={pet.color} />
        <Info icon={<Cake size={18} color={colors.primaryDeep} />} label="Idade" value={pet.approxAge} />
      </View>

      {onReportLost ? (
        <View className="px-5 pt-4">
          <PrimaryButton title="Registrar como perdido" onPress={onReportLost} icon={<AlertTriangle size={18} color={colors.white} />} />
        </View>
      ) : null}
    </ScrollView>
  );
}
