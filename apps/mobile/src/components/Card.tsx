import { Text, View, type ViewProps } from "react-native";
import { elevation } from "@miaucha/shared";
import { cn } from "@/lib/cn";

/** O bloco branco de cantos arredondados usado em todo o app, com borda fina e a sombra `elevation.card`. */
export function Card({ className, style, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("rounded-[20px] border border-border bg-card p-4", className)} style={[elevation.card, style]} {...props} />;
}

/** Título de seção dentro das telas (ex.: "Fotos do animal", "Último local visto"). */
export function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-3 font-ui-bold text-sm text-foreground">{children}</Text>;
}
