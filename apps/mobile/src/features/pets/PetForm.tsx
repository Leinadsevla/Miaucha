import { useState } from "react";
import { Text, View } from "react-native";
import { MAX_PET_PHOTOS, validatePet, type FieldErrors, type PetInput } from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, TextField } from "@/components";
import { PhotoPickerField } from "./PhotoPickerField";
import { SpeciesSelector } from "./SpeciesSelector";
import type { PickedPhoto } from "./photos";

type Props = {
  onSubmit: (input: PetInput, photos: PickedPhoto[]) => void;
  /** Abre o seletor de fotos permitindo até `remaining` imagens. */
  onPickPhotos: (remaining: number) => Promise<PickedPhoto[]>;
  loading?: boolean;
  serverError?: string;
};

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

  const set = (key: keyof PetInput, value: string) => setInput((prev) => ({ ...prev, [key]: value }));

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
        <PhotoPickerField photos={photos} onChange={setPhotos} onPickPhotos={onPickPhotos} max={MAX_PET_PHOTOS} />
      </Card>

      <Card>
        <SectionLabel>Tipo de animal</SectionLabel>
        <SpeciesSelector value={input.species} onChange={(species) => set("species", species)} error={errors.species} />
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
