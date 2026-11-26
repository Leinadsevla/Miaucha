import { Asset } from "expo-asset";

/**
 * Fotos dos dados de exemplo (modo demonstração e prévia da tela de entrada), embutidas no app para
 * funcionarem sem internet. Licença Unsplash (uso livre). Ficam em `assets/demo`.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
export const DEMO_PHOTOS = {
  goldenDog: require("../../../assets/demo/cao-dourado.jpg") as number,
  beagle: require("../../../assets/demo/cao-beagle.jpg") as number,
  blackWhiteCat: require("../../../assets/demo/gato-preto-e-branco.jpg") as number,
  orangeCat: require("../../../assets/demo/gato-laranja.jpg") as number,
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type DemoPhoto = keyof typeof DEMO_PHOTOS;

/** Endereço da foto embutida (as ocorrências guardam fotos como texto). Vazio se o aparelho não resolver. */
export function demoPhotoUri(photo: DemoPhoto, resolve: (module: number) => { uri: string } = Asset.fromModule): string {
  try {
    return resolve(DEMO_PHOTOS[photo]).uri ?? "";
  } catch {
    return "";
  }
}
