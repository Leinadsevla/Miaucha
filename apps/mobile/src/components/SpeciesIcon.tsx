import { Cat, Dog } from "lucide-react-native";
import type { Species } from "@miaucha/shared";

export function SpeciesIcon({ species, size = 16, color }: { species: Species; size?: number; color?: string }) {
  return species === "dog" ? <Dog size={size} color={color} /> : <Cat size={size} color={color} />;
}
