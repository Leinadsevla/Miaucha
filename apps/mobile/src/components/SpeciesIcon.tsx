import { Bird, Cat, Dog, PawPrint, Rabbit, Rat, Turtle } from "lucide-react-native";
import type { Species } from "@miaucha/shared";

const ICONS = { dog: Dog, cat: Cat, bird: Bird, rabbit: Rabbit, rodent: Rat, reptile: Turtle, other: PawPrint } as const;

/** Ícone da espécie (MP-01: o ícone diz a espécie; a cor diz o tipo da ocorrência). */
export function SpeciesIcon({ species, size = 16, color }: { species: Species; size?: number; color?: string }) {
  const Icon = ICONS[species] ?? PawPrint;
  return <Icon testID={`species-icon-${species}`} size={size} color={color} />;
}
