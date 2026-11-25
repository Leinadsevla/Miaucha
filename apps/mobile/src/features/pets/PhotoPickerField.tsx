import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Camera, X } from "lucide-react-native";
import { colors } from "@miaucha/shared";
import { checkPhoto, type PickedPhoto } from "./photos";

type Props = {
  photos: PickedPhoto[];
  onChange: (photos: PickedPhoto[]) => void;
  /** Abre o seletor de fotos permitindo até `remaining` imagens. */
  onPickPhotos: (remaining: number) => Promise<PickedPhoto[]>;
  max: number;
  /** Edição: fotos já salvas (contam no limite) e o que fazer ao removê-las. */
  existing?: { id: string; url: string }[];
  onRemoveExisting?: (photoId: string) => void;
};

/** Miniaturas das fotos escolhidas, com remover e adicionar (até `max`). Recusa formatos não aceitos com mensagem. */
export function PhotoPickerField({ photos, onChange, onPickPhotos, max, existing = [], onRemoveExisting }: Props) {
  const [photoError, setPhotoError] = useState<string>();
  const free = max - existing.length - photos.length;

  async function addPhotos() {
    const picked = await onPickPhotos(free);
    const problems = picked.map(checkPhoto);
    setPhotoError(problems.find(Boolean) ?? undefined);
    onChange([...photos, ...picked.filter((_, i) => !problems[i]).slice(0, free)]);
  }

  return (
    <View>
      <View className="flex-row flex-wrap gap-3">
        {existing.map((photo, i) => (
          <View key={photo.id} className="relative">
            <Image accessibilityLabel={`Foto salva ${i + 1}`} source={{ uri: photo.url }} style={{ width: 72, height: 72, borderRadius: 16 }} />
            {onRemoveExisting ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover foto salva ${i + 1}`}
                onPress={() => onRemoveExisting(photo.id)}
                className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-lost"
              >
                <X size={14} color={colors.white} />
              </Pressable>
            ) : null}
          </View>
        ))}
        {photos.map((photo, i) => (
          <View key={photo.uri} className="relative">
            <Image accessibilityLabel={`Foto ${i + 1}`} source={{ uri: photo.uri }} style={{ width: 72, height: 72, borderRadius: 16 }} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remover foto ${i + 1}`}
              onPress={() => onChange(photos.filter((_, j) => j !== i))}
              className="absolute -right-2 -top-2 h-6 w-6 items-center justify-center rounded-full bg-lost"
            >
              <X size={14} color={colors.white} />
            </Pressable>
          </View>
        ))}
        {free > 0 ? (
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
      <Text className="mt-2 font-sans text-[10px] text-muted-foreground">JPG, PNG ou WebP, até 10 MB, no máximo {max} fotos</Text>
      {photoError ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{photoError}</Text> : null}
    </View>
  );
}
