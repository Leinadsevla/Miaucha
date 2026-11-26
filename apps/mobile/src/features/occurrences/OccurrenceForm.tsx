import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { AlertTriangle, Eye, HandHeart, Map as MapIcon, MapPin, Navigation, Search, SearchX } from "lucide-react-native";
import { Image } from "expo-image";
import {
  MAX_OCCURRENCE_PHOTOS,
  colors,
  occurrenceStyle,
  validateOccurrence,
  type OccurrenceErrors,
  type OccurrenceInput,
  type OccurrenceUpdate,
  type LatLng,
  type MyPet,
  type OccurrenceType,
  type Species,
  withAlpha,
} from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, SpeciesIcon, TextField } from "@/components";
import { cn } from "@/lib/cn";
import type { LocationResult } from "@/features/location/currentLocation";
import { PinPicker } from "@/features/map/PinPicker";
import { DEFAULT_REGION } from "@/features/map/region";
import { LocationProblem } from "@/features/location/LocationProblem";
import { NEARBY_GEOCODE_KM } from "@/features/location/geocode";
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
  /** Edição de uma ocorrência do usuário: tipo fixo, fotos já salvas e "Manter o local" por padrão. */
  editing?: { photos: { id: string; url: string }[] };
  /** Salvar a edição (no lugar do `onSubmit`): `location` só vem se o usuário escolheu um local novo. */
  onSave?: (update: OccurrenceUpdate, newPhotos: PickedPhoto[], removedPhotoIds: string[]) => void;
  /** "Vi este pet": o tipo fica fixo em avistado e a API avisa o tutor do pet perdido. */
  sightingOf?: { id: string; petName: string };
  /** Pets do usuário, para escolher em "Perdi meu pet". */
  myPets?: MyPet[];
  /** Procura um endereço digitado e devolve o ponto (ou null se não achou). */
  onGeocode?: (address: string) => Promise<LatLng | null>;
  loading?: boolean;
  serverError?: string;
};

type SelectedPet = { id: string; name: string; photoCount: number };
type LocationMode = "keep" | "current" | "address" | "map";

const MESSAGES = {
  searchFirst: "Procure o endereço para marcar o local",
  tapMap: "Toque no mapa para marcar o local",
  notFound: `Não encontramos esse endereço perto de você (até ${NEARBY_GEOCODE_KM} km). Confira rua, número e cidade.`,
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
  sightingOf,
  editing,
  onSave,
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
  const [locationMode, setLocationMode] = useState<LocationMode>(editing ? "keep" : "current");
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const keptPhotos = (editing?.photos ?? []).filter((p) => !removedPhotoIds.includes(p.id));
  // Na edição, a localização do aparelho só é buscada quando a pessoa escolhe "Minha localização"
  // (corrigir um texto não deve abrir o pedido de permissão de localização).
  const wantsCurrent = locationMode === "current";
  useEffect(() => {
    if (editing && wantsCurrent && location === null) onRetryLocation();
    // Só ao trocar o modo: `location` volta a null enquanto busca e não deve disparar outra busca.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsCurrent]);
  // Ponto do endereço procurado; só vale enquanto o texto do endereço não mudar.
  const [found, setFound] = useState<{ query: string; coords: LatLng } | null>(null);
  const [searching, setSearching] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string>();
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((prev) => ({ ...prev, [key]: value }));
  const remainingPhotos = MAX_OCCURRENCE_PHOTOS - (selectedPet?.photoCount ?? 0) - keptPhotos.length;
  const address = values.approxAddress.trim();
  const addressPoint = found && found.query === address ? found.coords : null;
  // Ponto de partida (localização atual ou endereço encontrado) e o ajuste feito arrastando o pino.
  const currentPoint = location?.status === "ok" ? location.coords : null;
  // Em "Marcar no mapa" não há ponto de partida: vale só o toque (o mapa abre na localização ou na região padrão).
  const basePoint = locationMode === "address" ? addressPoint : locationMode === "current" ? currentPoint : null;
  const mapCenter = currentPoint ?? { lat: DEFAULT_REGION.latitude, lng: DEFAULT_REGION.longitude };
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
    if (locationMode === "map" && !pin) {
      setErrors({ location: MESSAGES.tapMap });
      return;
    }
    const coords = pin ?? basePoint ?? { lat: Number.NaN, lng: Number.NaN };
    if (editing && onSave) {
      const update: OccurrenceUpdate = {
        species: values.species,
        petName: values.petName.trim(),
        breed: values.breed.trim(),
        color: values.color.trim(),
        approxAddress: values.approxAddress.trim(),
        description: values.description.trim(),
        ...(locationMode === "keep" ? {} : { location: coords }),
      };
      // Mantendo o local, valida com um ponto qualquer válido (o local salvo não muda).
      const problems = validateOccurrence({ ...update, type: values.type, ...(update.location ?? { lat: 0, lng: 0 }) });
      setErrors(problems);
      if (Object.keys(problems).length === 0) onSave(update, photos, removedPhotoIds);
      return;
    }
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
      ...(sightingOf ? { sightingOf: sightingOf.id } : {}),
    };
    const found = validateOccurrence(input);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit(input, photos);
  }

  return (
    <View className="gap-4">
      {sightingOf ? (
        <View className="flex-row items-start gap-2 rounded-2xl bg-primary-soft p-3">
          <Eye size={16} color={colors.primary} />
          <Text className="flex-1 font-nunito-semibold text-xs text-foreground">
            {`Você viu ${sightingOf.petName}. O tutor recebe um aviso na hora, com a região aproximada de onde você está.`}
          </Text>
        </View>
      ) : editing ? null : (
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
                  className="flex-row items-center gap-3 rounded-2xl border-2 px-4"
                  style={{ minHeight: 56, borderColor: selected ? color : colors.border, backgroundColor: selected ? withAlpha(color, 0.12) : colors.card }}
                >
                  <View className="h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: selected ? color : colors.muted }}>
                    <Icon size={18} color={selected ? occurrenceStyle(value).textOn : colors.mutedForeground} />
                  </View>
                  {/* Texto escuro: a cor do tipo (amarelo, verde) sobre fundo claro não tem contraste para texto. */}
                  <Text className={selected ? "font-nunito-black text-base" : "font-nunito-bold text-base"} style={{ color: selected ? colors.foreground : colors.mutedForeground }}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {errors.type ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{errors.type}</Text> : null}
        </Card>
      )}

      {values.type === "lost" && myPets.length > 0 && !editing ? (
        <Card>
          <SectionLabel>Qual pet?</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {myPets.map((pet) => (
              <PetChoice key={pet.id} label={pet.name} selected={selectedPet?.id === pet.id} onPress={() => choosePet(pet)}>
                {pet.photos[0] ? (
                  <Image source={{ uri: pet.photos[0].url }} style={{ width: 28, height: 28, borderRadius: 9 }} />
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
        <PhotoPickerField
          photos={photos}
          onChange={setPhotos}
          onPickPhotos={onPickPhotos}
          max={Math.max(0, remainingPhotos) + keptPhotos.length}
          existing={keptPhotos}
          onRemoveExisting={(id) => setRemovedPhotoIds((prev) => [...prev, id])}
        />
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
        <View className="flex-row flex-wrap gap-2">
          {editing ? (
            <PetChoice label="Manter o local" selected={locationMode === "keep"} onPress={() => setLocationMode("keep")}>
              <MapPin size={14} color={locationMode === "keep" ? colors.primary : colors.mutedForeground} />
            </PetChoice>
          ) : null}
          <PetChoice label="Minha localização" selected={locationMode === "current"} onPress={() => setLocationMode("current")}>
            <Navigation size={14} color={locationMode === "current" ? colors.primary : colors.mutedForeground} />
          </PetChoice>
          <PetChoice label="Outro endereço" selected={locationMode === "address"} onPress={() => setLocationMode("address")}>
            <MapPin size={14} color={locationMode === "address" ? colors.primary : colors.mutedForeground} />
          </PetChoice>
          <PetChoice label="Marcar no mapa" selected={locationMode === "map"} onPress={() => setLocationMode("map")}>
            <MapIcon size={14} color={locationMode === "map" ? colors.primary : colors.mutedForeground} />
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
              <Text className="font-nunito-semibold text-xs text-foreground">{MESSAGES.found}</Text>
            ) : geocodeError ? (
              <Text className="font-nunito-semibold text-xs text-lost">{geocodeError}</Text>
            ) : null}
          </>
        ) : locationMode === "keep" ? (
          <Text className="font-sans text-xs text-muted-foreground">O local registrado continua o mesmo.</Text>
        ) : locationMode === "map" ? null : location === null ? (
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
        {locationMode === "map" ? (
          <PinPicker value={pin} center={mapCenter} onChange={setPin} height={300} />
        ) : basePoint ? (
          <PinPicker value={pin ?? basePoint} onChange={setPin} />
        ) : null}
        {errors.location ? <Text className="font-nunito-semibold text-xs text-lost">{errors.location}</Text> : null}
        {locationMode !== "address" ? (
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
      {editing ? (
        <PrimaryButton title="Salvar alterações" onPress={submit} loading={loading} />
      ) : (
        <PrimaryButton title="Emitir alerta" onPress={submit} loading={loading} icon={<AlertTriangle size={18} color={colors.white} />} />
      )}
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
      className={cn("flex-row items-center gap-2 rounded-full border-2 px-4", selected ? "border-primary bg-primary-soft" : "border-border bg-card")}
      style={{ minHeight: 44 }}
    >
      {children}
      <Text className={cn("text-sm", selected ? "font-nunito-black text-foreground" : "font-nunito-bold text-muted-foreground")}>{label}</Text>
    </Pressable>
  );
}
