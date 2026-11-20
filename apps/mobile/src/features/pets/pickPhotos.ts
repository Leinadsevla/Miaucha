import * as ImagePicker from "expo-image-picker";
import type { PickedPhoto } from "./photos";

type LibraryOptions = { mediaTypes: ["images"]; allowsMultipleSelection: true; selectionLimit: number; quality: number };
type LibraryResult = { canceled: boolean; assets: (PickedPhoto & { width?: number; height?: number })[] | null };

/** Subconjunto do `launchImageLibraryAsync`; injetável nos testes. */
export type LaunchLibrary = (options: LibraryOptions) => Promise<LibraryResult>;

/**
 * Galeria sem pedido de permissão (o picker do sistema não exige). `quality` < 1 recomprime a imagem,
 * o que reduz o tamanho e, no iOS, entrega JPEG em vez de HEIC.
 */
export function createPhotoPicker(launch: LaunchLibrary = ImagePicker.launchImageLibraryAsync) {
  return async (remaining: number): Promise<PickedPhoto[]> => {
    if (remaining <= 0) return [];
    const result = await launch({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.7 });
    if (result.canceled || !result.assets) return [];
    return result.assets.map(({ uri, mimeType, fileSize }) => ({ uri, mimeType, fileSize }));
  };
}
