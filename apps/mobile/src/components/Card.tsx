import { Text, View, type ViewProps } from "react-native";
import { elevation } from "@miaucha/shared";
import { cn } from "@/lib/cn";

/** O bloco branco de cantos arredondados usado em todo o app, com a sombra `elevation.card`. */
export function Card({ className, style, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("rounded-3xl border border-border bg-card p-4", className)} style={[elevation.card, style]} {...props} />;
}

/** Rótulos como "FOTO DO ANIMAL" e "ÚLTIMO LOCAL VISTO". */
export function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-3 font-nunito-black text-xs uppercase tracking-wider text-muted-foreground">{children}</Text>;
}
