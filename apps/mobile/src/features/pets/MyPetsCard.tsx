import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Plus } from "lucide-react-native";
import { colors, type MyPet } from "@miaucha/shared";
import { Card, SpeciesIcon } from "@/components";

type Props = {
  /** null enquanto carrega. */
  pets: MyPet[] | null;
  error?: string;
  onAdd: () => void;
  onOpen: (petId: string) => void;
};

export function MyPetsCard({ pets, error, onAdd, onOpen }: Props) {
  return (
    <Card>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="font-nunito-black text-sm text-foreground">Meus Pets</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Adicionar pet" onPress={onAdd} className="flex-row items-center gap-1">
          <Plus size={12} color={colors.primary} />
          <Text className="font-nunito-bold text-xs text-primary">Adicionar</Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-sans text-xs text-lost">{error}</Text>
      ) : pets === null ? (
        <Text className="font-sans text-xs text-muted-foreground">Carregando...</Text>
      ) : pets.length === 0 ? (
        <Text className="font-sans text-xs text-muted-foreground">Nenhum pet cadastrado ainda</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${pet.name}`}
              onPress={() => onOpen(pet.id)}
              className="flex-row items-center gap-2 rounded-2xl bg-muted px-3 py-2 active:opacity-70"
            >
              {pet.photos[0] ? (
                <Image
                  accessibilityLabel={`Foto de ${pet.name}`}
                  source={{ uri: pet.photos[0].url }}
                  style={{ width: 32, height: 32, borderRadius: 12 }}
                />
              ) : (
                <View className="h-8 w-8 items-center justify-center rounded-xl bg-white">
                  <SpeciesIcon species={pet.species} size={16} color={colors.mutedForeground} />
                </View>
              )}
              <View>
                <Text className="font-nunito-bold text-xs text-foreground">{pet.name}</Text>
                {pet.breed ? <Text className="font-sans text-[10px] text-muted-foreground">{pet.breed}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}
