import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AlertTriangle, Eye, HandHeart, MapPin, SearchX } from "lucide-react-native";
import {
  MAX_OCCURRENCE_PHOTOS,
  colors,
  occurrenceStyle,
  validateOccurrence,
  type OccurrenceErrors,
  type OccurrenceInput,
  type OccurrenceType,
  type Species,
} from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, TextField } from "@/components";
import type { LocationResult } from "@/features/location/currentLocation";
import { LocationProblem } from "@/features/location/LocationProblem";
import { PhotoPickerField } from "@/features/pets/PhotoPickerField";
import { SpeciesSelector } from "@/features/pets/SpeciesSelector";
import type { PickedPhoto } from "@/features/pets/photos";

type Values = { type: OccurrenceType; species: Species; petName: string; breed: string; color: string; approxAddress: string; description: string };

export type OccurrenceFormProps = {
  /** null enquanto a localização é buscada. */
  location: LocationResult | null;
  onRetryLocation: () => void;
  onOpenSettings?: () => void;
  onSubmit: (input: OccurrenceInput, photos: PickedPhoto[]) => void;
  onPickPhotos: (remaining: number) => Promise<PickedPhoto[]>;
  initial?: Partial<Values>;
  /** Registro a partir de um pet do usuário: a API completa os dados e reaproveita as fotos dele. */
  fromPet?: { id: string; name: string; photoCount: number };
  loading?: boolean;
  serverError?: string;
};

const TYPES: { value: OccurrenceType; label: string; icon: typeof SearchX }[] = [
  { value: "lost", label: "Perdi meu pet", icon: SearchX },
  { value: "seen", label: "Vi um pet", icon: Eye },
  { value: "found", label: "Encontrei um pet", icon: HandHeart },
];

function fromPetNote({ name, photoCount }: { name: string; photoCount: number }) {
  const photos =
    photoCount === 0 ? "" : photoCount === 1 ? " A foto do cadastro entra no alerta." : ` As ${photoCount} fotos do cadastro entram no alerta.`;
  return `Dados de ${name} preenchidos pelo cadastro.${photos}`;
}

/** Formulário de nova ocorrência (RegisterPetScreen do protótipo), com tipo, fotos, espécie, dados e local. */
export function OccurrenceForm({
  location,
  onRetryLocation,
  onOpenSettings,
  onSubmit,
  onPickPhotos,
  initial,
  fromPet,
  loading,
  serverError,
}: OccurrenceFormProps) {
  const [values, setValues] = useState<Values>({
    type: "lost",
    species: "dog",
    petName: "",
    breed: "",
    color: "",
    approxAddress: "",
    description: "",
    ...initial,
  });
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [errors, setErrors] = useState<OccurrenceErrors>({});
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const remainingPhotos = MAX_OCCURRENCE_PHOTOS - (fromPet?.photoCount ?? 0);

  function submit() {
    const coords = location?.status === "ok" ? location.coords : { lat: Number.NaN, lng: Number.NaN };
    const input: OccurrenceInput = {
      type: values.type,
      species: values.species,
      petName: values.petName.trim(),
      breed: values.breed.trim(),
      color: values.color.trim(),
      approxAddress: values.approxAddress.trim(),
      description: values.description.trim(),
      ...coords,
      ...(fromPet ? { petId: fromPet.id } : {}),
    };
    const found = validateOccurrence(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(input, photos);
  }

  return (
    <View className="gap-4">
      <Card>
        <SectionLabel>O que aconteceu?</SectionLabel>
        <View className="gap-2">
          {TYPES.map(({ value, label, icon: Icon }) => {
            const selected = values.type === value;
            const { color } = occurrenceStyle(value);
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityState={{ selected }}
                onPress={() => set("type", value)}
                className="flex-row items-center gap-3 rounded-2xl border-2 px-4 py-3"
                style={{ borderColor: selected ? color : colors.border, backgroundColor: selected ? `${color}14` : colors.card }}
              >
                <Icon size={18} color={selected ? color : colors.mutedForeground} />
                <Text className="font-nunito-bold text-sm" style={{ color: selected ? color : colors.mutedForeground }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.type ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{errors.type}</Text> : null}
      </Card>

      {fromPet ? (
        <View className="rounded-2xl bg-primary-soft p-3">
          <Text className="font-nunito-semibold text-xs text-foreground">{fromPetNote(fromPet)}</Text>
        </View>
      ) : null}

      <Card>
        <SectionLabel>Fotos do animal</SectionLabel>
        <PhotoPickerField photos={photos} onChange={setPhotos} onPickPhotos={onPickPhotos} max={Math.max(0, remainingPhotos)} />
      </Card>

      <Card>
        <SectionLabel>Tipo de animal</SectionLabel>
        <SpeciesSelector value={values.species} onChange={(species) => set("species", species)} error={errors.species} />
      </Card>

      <Card className="gap-3">
        <SectionLabel>Informações do pet</SectionLabel>
        <TextField
          label={values.type === "lost" ? "Nome do pet" : "Nome do pet (se souber)"}
          placeholder="Ex: Thor, Luna..."
          value={values.petName}
          onChangeText={(v) => set("petName", v)}
          error={errors.petName}
        />
        <TextField label="Raça" placeholder="Ex: Golden Retriever, SRD..." value={values.breed} onChangeText={(v) => set("breed", v)} error={errors.breed} />
        <TextField
          label="Cor predominante"
          placeholder="Ex: Dourado, Preto e Branco..."
          value={values.color}
          onChangeText={(v) => set("color", v)}
          error={errors.color}
        />
      </Card>

      <Card className="gap-3">
        <SectionLabel>{values.type === "lost" ? "Último local visto" : "Onde foi"}</SectionLabel>
        {location === null ? (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator color={colors.primary} />
            <Text className="font-sans text-xs text-muted-foreground">Buscando sua localização...</Text>
          </View>
        ) : location.status === "ok" ? (
          <View className="flex-row items-center gap-2">
            <MapPin size={14} color={colors.accent} />
            <Text className="flex-1 font-sans text-xs text-muted-foreground">
              Usando sua localização atual. No mapa, aparece uma região aproximada (~150 m).
            </Text>
          </View>
        ) : (
          <LocationProblem result={location} purpose="marcar onde o pet foi visto" onRetry={onRetryLocation} onOpenSettings={onOpenSettings} />
        )}
        {errors.location ? <Text className="font-nunito-semibold text-xs text-lost">{errors.location}</Text> : null}
        <TextField
          label="Endereço aproximado"
          placeholder="Ex: Av. Paulista, perto do MASP"
          value={values.approxAddress}
          onChangeText={(v) => set("approxAddress", v)}
          error={errors.approxAddress}
        />
      </Card>

      <Card>
        <SectionLabel>Descrição adicional</SectionLabel>
        <TextField
          label="Descrição"
          placeholder="Características especiais, comportamento, coleira..."
          value={values.description}
          onChangeText={(v) => set("description", v)}
          error={errors.description}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: "top" }}
        />
      </Card>

      {serverError ? <Text className="text-center font-nunito-semibold text-sm text-lost">{serverError}</Text> : null}
      <PrimaryButton title="Emitir alerta" onPress={submit} loading={loading} icon={<AlertTriangle size={18} color={colors.white} />} />
    </View>
  );
}
