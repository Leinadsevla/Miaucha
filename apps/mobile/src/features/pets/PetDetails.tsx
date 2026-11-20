import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Cake, ChevronLeft, Palette, PawPrint } from "lucide-react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, type MyPet } from "@miaucha/shared";
import { Card, SpeciesIcon } from "@/components";

const PHOTO_HEIGHT = 288;
const OVERLAY = "rgba(0, 0, 0, 0.35)";
const NOT_INFORMED = "Não informado";

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <Card className="w-[48%] gap-1 p-3">
      {icon}
      <Text className="font-sans text-xs text-muted-foreground">{label}</Text>
      <Text className="font-nunito-bold text-sm text-foreground">{value || NOT_INFORMED}</Text>
    </Card>
  );
}

/** Detalhes do pet para o tutor: galeria de fotos (deslize para o lado) e informações do cadastro. */
export function PetDetails({ pet, onBack }: { pet: MyPet; onBack: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const subtitle = [pet.breed, pet.color].filter(Boolean).join(" · ");

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
      <View style={{ height: PHOTO_HEIGHT }} className="bg-muted">
        {pet.photos.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {pet.photos.map((photo, i) => (
              <Image
                key={photo.id}
                accessibilityLabel={`Foto ${i + 1} de ${pet.photos.length} de ${pet.name}`}
                source={{ uri: photo.url }}
                contentFit="cover"
                style={{ width, height: PHOTO_HEIGHT }}
              />
            ))}
          </ScrollView>
        ) : (
          <View accessibilityLabel={`${pet.name} ainda não tem foto`} className="flex-1 items-center justify-center">
            <SpeciesIcon species={pet.species} size={72} color={colors.mutedForeground} />
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={onBack}
          style={{ top: insets.top + 12, backgroundColor: OVERLAY }}
          className="absolute left-4 h-10 w-10 items-center justify-center rounded-2xl"
        >
          <ChevronLeft size={20} color={colors.white} />
        </Pressable>

        <View pointerEvents="none" style={{ backgroundColor: OVERLAY }} className="absolute bottom-0 left-0 right-0 px-5 pb-4 pt-3">
          <Text accessibilityRole="header" className="font-nunito-black text-2xl text-white">
            {pet.name}
          </Text>
          {subtitle ? <Text className="font-sans text-sm text-white">{subtitle}</Text> : null}
          {pet.photos.length > 1 ? (
            <Text className="mt-1 font-sans text-xs text-white">Deslize para ver as {pet.photos.length} fotos</Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row flex-wrap justify-between gap-y-3 px-5 pt-4">
        <Info
          icon={<SpeciesIcon species={pet.species} size={18} color={colors.primary} />}
          label="Espécie"
          value={pet.species === "dog" ? "Cão" : "Gato"}
        />
        <Info icon={<PawPrint size={18} color={colors.primary} />} label="Raça" value={pet.breed} />
        <Info icon={<Palette size={18} color={colors.primary} />} label="Cor" value={pet.color} />
        <Info icon={<Cake size={18} color={colors.primary} />} label="Idade" value={pet.approxAge} />
      </View>
    </ScrollView>
  );
}
