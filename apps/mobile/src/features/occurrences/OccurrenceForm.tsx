import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AlertTriangle, Eye, HandHeart, MapPin, Navigation, Search, SearchX } from "lucide-react-native";
import { Image } from "expo-image";
import {
  MAX_OCCURRENCE_PHOTOS,
  colors,
  occurrenceStyle,
  validateOccurrence,
  type OccurrenceErrors,
  type OccurrenceInput,
  type LatLng,
  type MyPet,
  type OccurrenceType,
  type Species,
} from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, SpeciesIcon, TextField } from "@/components";
import { cn } from "@/lib/cn";
import type { LocationResult } from "@/features/location/currentLocation";
import { PinPicker } from "@/features/map/PinPicker";
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
  fromPet?: SelectedPet;
  /** Pets do usuário, para escolher em "Perdi meu pet". */
  myPets?: MyPet[];
  /** Procura um endereço digitado e devolve o ponto (ou null se não achou). */
  onGeocode?: (address: string) => Promise<LatLng | null>;
  loading?: boolean;
  serverError?: string;
};

type SelectedPet = { id: string; name: string; photoCount: number };
type LocationMode = "current" | "address";

const MESSAGES = {
  searchFirst: "Procure o endereço para marcar o local",
  notFound: "Não encontramos esse endereço. Tente com rua, número e cidade.",
  found: "Endereço encontrado. No mapa aparece uma região aproximada (~150 m).",
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
  myPets = [],
  onGeocode,
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
  const [selectedPet, setSelectedPet] = useState<SelectedPet | null>(fromPet ?? null);
  const [locationMode, setLocationMode] = useState<LocationMode>("current");
  // Ponto do endereço procurado; só vale enquanto o texto do endereço não mudar.
  const [found, setFound] = useState<{ query: string; coords: LatLng } | null>(null);
  const [searching, setSearching] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string>();
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const remainingPhotos = MAX_OCCURRENCE_PHOTOS - (selectedPet?.photoCount ?? 0);
  const address = values.approxAddress.trim();
  const addressPoint = found && found.query === address ? found.coords : null;
  // Ponto de partida (localização atual ou endereço encontrado) e o ajuste feito arrastando o pino.
  const basePoint = locationMode === "address" ? addressPoint : location?.status === "ok" ? location.coords : null;
  const [pin, setPin] = useState<LatLng | null>(null);
  useEffect(() => setPin(null), [locationMode, found, location]);

  function chooseType(type: OccurrenceType) {
    set("type", type);
    if (type !== "lost") setSelectedPet(null);
  }

  function choosePet(pet: MyPet | null) {
    setSelectedPet(pet ? { id: pet.id, name: pet.name, photoCount: pet.photos.length } : null);
    setValues((prev) => ({
      ...prev,
      species: pet?.species ?? prev.species,
      petName: pet?.name ?? "",
      breed: pet?.breed ?? "",
      color: pet?.color ?? "",
    }));
  }

  async function searchAddress() {
    if (!onGeocode || !address) return setGeocodeError(MESSAGES.searchFirst);
    setSearching(true);
    setGeocodeError(undefined);
    try {
      const coords = await onGeocode(address);
      setFound(coords ? { query: address, coords } : null);
      if (!coords) setGeocodeError(MESSAGES.notFound);
    } finally {
      setSearching(false);
    }
  }

  function submit() {
    if (locationMode === "address" && !addressPoint) {
      setErrors({ location: MESSAGES.searchFirst });
      return;
    }
    const coords = pin ?? basePoint ?? { lat: Number.NaN, lng: Number.NaN };
    const input: OccurrenceInput = {
      type: values.type,
      species: values.species,
      petName: values.petName.trim(),
      breed: values.breed.trim(),
      color: values.color.trim(),
      approxAddress: values.approxAddress.trim(),
      description: values.description.trim(),
      ...coords,
      ...(selectedPet ? { petId: selectedPet.id } : {}),
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
                onPress={() => chooseType(value)}
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

      {values.type === "lost" && myPets.length > 0 ? (
        <Card>
          <SectionLabel>Qual pet?</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {myPets.map((pet) => (
              <PetChoice key={pet.id} label={pet.name} selected={selectedPet?.id === pet.id} onPress={() => choosePet(pet)}>
                {pet.photos[0] ? (
                  <Image source={{ uri: pet.photos[0].url }} style={{ width: 24, height: 24, borderRadius: 8 }} />
                ) : (
                  <SpeciesIcon species={pet.species} size={16} color={colors.mutedForeground} />
                )}
              </PetChoice>
            ))}
            <PetChoice label="Outro pet" selected={!selectedPet} onPress={() => choosePet(null)} />
          </View>
        </Card>
      ) : null}

      {selectedPet ? (
        <View className="rounded-2xl bg-primary-soft p-3">
          <Text className="font-nunito-semibold text-xs text-foreground">{fromPetNote(selectedPet)}</Text>
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
        <View className="flex-row gap-2">
          <PetChoice label="Minha localização" selected={locationMode === "current"} onPress={() => setLocationMode("current")}>
            <Navigation size={14} color={locationMode === "current" ? colors.primary : colors.mutedForeground} />
          </PetChoice>
          <PetChoice label="Outro endereço" selected={locationMode === "address"} onPress={() => setLocationMode("address")}>
            <MapPin size={14} color={locationMode === "address" ? colors.primary : colors.mutedForeground} />
          </PetChoice>
        </View>
        {locationMode === "address" ? (
          <>
            <TextField
              label="Endereço"
              placeholder="Rua, número, bairro e cidade"
              value={values.approxAddress}
              onChangeText={(v) => set("approxAddress", v)}
              onSubmitEditing={() => void searchAddress()}
              returnKeyType="search"
              error={errors.approxAddress}
            />
            <PrimaryButton
              title="Procurar endereço"
              variant="outline"
              onPress={() => void searchAddress()}
              loading={searching}
              icon={<Search size={16} color={colors.foreground} />}
            />
            {addressPoint ? (
              <Text className="font-sans text-xs text-found">{MESSAGES.found}</Text>
            ) : geocodeError ? (
              <Text className="font-nunito-semibold text-xs text-lost">{geocodeError}</Text>
            ) : null}
          </>
        ) : location === null ? (
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
        {basePoint ? <PinPicker value={pin ?? basePoint} onChange={setPin} /> : null}
        {errors.location ? <Text className="font-nunito-semibold text-xs text-lost">{errors.location}</Text> : null}
        {locationMode === "current" ? (
          <TextField
            label="Endereço aproximado"
            placeholder="Ex: Av. Paulista, perto do MASP"
            value={values.approxAddress}
            onChangeText={(v) => set("approxAddress", v)}
            error={errors.approxAddress}
          />
        ) : null}
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

/** Opção em forma de "pílula" (pets do usuário e modo do local). */
function PetChoice({ label, selected, onPress, children }: { label: string; selected: boolean; onPress: () => void; children?: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn("flex-row items-center gap-2 rounded-2xl border-2 px-3 py-2", selected ? "border-primary bg-primary-soft" : "border-border bg-card")}
    >
      {children}
      <Text className={cn("font-nunito-bold text-xs", selected ? "text-primary" : "text-muted-foreground")}>{label}</Text>
    </Pressable>
  );
}
