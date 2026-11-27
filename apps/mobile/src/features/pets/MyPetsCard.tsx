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
      <View className="mb-2 flex-row items-center justify-between">
        <Text accessibilityRole="header" className="font-ui-extrabold text-base text-foreground">
          Meus Pets
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Adicionar pet"
          onPress={onAdd}
          style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, opacity: pressed ? 0.6 : 1 })}
        >
          <Plus size={16} color={colors.brand} strokeWidth={2.6} />
          <Text className="font-ui-bold text-sm text-brand">Adicionar</Text>
        </Pressable>
      </View>

      {error ? (
        <Text className="font-ui-semibold text-sm text-lost">{error}</Text>
      ) : pets === null ? (
        <Text className="font-sans text-sm text-muted-foreground">Carregando...</Text>
      ) : pets.length === 0 ? (
        <Text className="font-sans text-sm text-muted-foreground">Nenhum pet cadastrado ainda</Text>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${pet.name}`}
              onPress={() => onOpen(pet.id)}
              className="flex-row items-center gap-2.5 rounded-2xl bg-muted py-2 pl-2 pr-4 active:opacity-70"
              style={{ minHeight: 56 }}
            >
              {pet.photos[0] ? (
                <Image
                  accessibilityLabel={`Foto de ${pet.name}`}
                  source={{ uri: pet.photos[0].url }}
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                />
              ) : (
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <SpeciesIcon species={pet.species} size={18} color={colors.foreground} />
                </View>
              )}
              <View>
                <Text className="font-ui-bold text-sm text-foreground">{pet.name}</Text>
                {pet.breed ? <Text className="font-sans text-xs text-muted-foreground">{pet.breed}</Text> : null}
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}
