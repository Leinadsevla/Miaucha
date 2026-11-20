import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Camera, X } from "lucide-react-native";
import { MAX_PET_PHOTOS, colors, validatePet, type FieldErrors, type PetInput, type Species } from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, SpeciesIcon, TextField } from "@/components";
import { cn } from "@/lib/cn";
import { checkPhoto, type PickedPhoto } from "./photos";

type Props = {
  onSubmit: (input: PetInput, photos: PickedPhoto[]) => void;
  /** Abre o seletor de fotos permitindo até `remaining` imagens. */
  onPickPhotos: (remaining: number) => Promise<PickedPhoto[]>;
  loading?: boolean;
  serverError?: string;
};

const SPECIES: { value: Species; label: string }[] = [
  { value: "dog", label: "Cão" },
  { value: "cat", label: "Gato" },
];

const FIELDS: { key: "name" | "breed" | "color" | "approxAge"; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome do pet", placeholder: "Ex: Thor, Luna..." },
  { key: "breed", label: "Raça", placeholder: "Ex: Golden Retriever, SRD..." },
  { key: "color", label: "Cor predominante", placeholder: "Ex: Dourado, Preto e Branco..." },
  { key: "approxAge", label: "Idade aproximada", placeholder: "Ex: 3 anos" },
];

export function PetForm({ onSubmit, onPickPhotos, loading, serverError }: Props) {
  const [input, setInput] = useState<PetInput>({ name: "", species: "dog", breed: "", color: "", approxAge: "" });
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<FieldErrors<PetInput>>({});
  const [photoError, setPhotoError] = useState<string>();

  const set = (key: keyof PetInput, value: string) => setInput((prev) => ({ ...prev, [key]: value }));

  async function addPhotos() {
    const picked = await onPickPhotos(MAX_PET_PHOTOS - photos.length);
    const problems = picked.map(checkPhoto);
    setPhotoError(problems.find(Boolean) ?? undefined);
    setPhotos((prev) => [...prev, ...picked.filter((_, i) => !problems[i])].slice(0, MAX_PET_PHOTOS));
  }

  function submit() {
    const found = validatePet(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(
      {
        name: input.name.trim(),
        species: input.species,
        breed: input.breed.trim(),
        color: input.color.trim(),
        approxAge: input.approxAge.trim(),
      },
      photos,
    );
  }

  return (
    <View className="gap-4">
      <Card>
        <SectionLabel>Fotos do pet</SectionLabel>
        <View className="flex-row flex-wrap gap-3">
          {photos.map((photo, i) => (
            <View key={photo.uri} className="relative">
              <Image accessibilityLabel={`Foto ${i + 1}`} source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: 16 }} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover foto ${i + 1}`}
                onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-lost"
              >
                <X size={14} color={colors.white} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX_PET_PHOTOS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar foto"
              onPress={addPhotos}
              className="h-[72px] w-[72px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5"
            >
              <Camera size={20} color={colors.primary} />
              <Text className="font-nunito-bold text-[10px] text-primary">Adicionar</Text>
            </Pressable>
          ) : null}
        </View>
        <Text className="mt-2 font-sans text-[10px] text-muted-foreground">JPG, PNG ou WebP, até 10 MB, no máximo {MAX_PET_PHOTOS} fotos</Text>
        {photoError ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{photoError}</Text> : null}
      </Card>

      <Card>
        <SectionLabel>Tipo de animal</SectionLabel>
        <View className="flex-row gap-3">
          {SPECIES.map(({ value, label }) => {
            const selected = input.species === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => set("species", value)}
                className={cn(
                  "flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-2 py-3",
                  selected ? "border-primary bg-primary" : "border-border",
                )}
              >
                <SpeciesIcon species={value} size={18} color={selected ? colors.white : colors.mutedForeground} />
                <Text className={cn("font-nunito-bold text-sm", selected ? "text-white" : "text-muted-foreground")}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        {errors.species ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{errors.species}</Text> : null}
      </Card>

      <Card className="gap-3">
        <SectionLabel>Informações do pet</SectionLabel>
        {FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            value={input[f.key]}
            onChangeText={(v) => set(f.key, v)}
            error={errors[f.key]}
          />
        ))}
      </Card>

      {serverError ? <Text className="text-center font-nunito-semibold text-sm text-lost">{serverError}</Text> : null}
      <PrimaryButton title="Salvar pet" variant="primary" onPress={submit} loading={loading} />
    </View>
  );
}
