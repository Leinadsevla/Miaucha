import { Text, View, type ViewProps } from "react-native";
import { cn } from "@/lib/cn";

/** O bloco "bg-white rounded-3xl border shadow-sm" repetido em todo o design. */
export function Card({ className, ...props }: ViewProps & { className?: string }) {
  return <View className={cn("rounded-3xl border border-border bg-card p-4 shadow-sm", className)} {...props} />;
}

/** Rótulos como "FOTO DO ANIMAL" e "ÚLTIMO LOCAL VISTO". */
export function SectionLabel({ children }: { children: string }) {
  return <Text className="mb-3 font-nunito-bold text-xs uppercase text-muted-foreground">{children}</Text>;
}
