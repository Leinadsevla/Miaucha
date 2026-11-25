import { Text, View } from "react-native";
import { MapPinOff } from "lucide-react-native";
import { colors } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import type { LocationResult } from "./currentLocation";

type Props = {
  result: Exclude<LocationResult, { status: "ok" }>;
  /** Completa a frase "Precisamos da sua localização para ...". */
  purpose: string;
  onRetry: () => void;
  onOpenSettings?: () => void;
};

/** Localização negada ou indisponível: explica o motivo e oferece tentar de novo. Nunca é um beco sem saída. */
export function LocationProblem({ result, purpose, onRetry, onOpenSettings }: Props) {
  const blocked = result.status === "denied" && !result.canAskAgain;
  const message =
    result.status === "denied"
      ? `Precisamos da sua localização para ${purpose}. Usamos só a região aproximada: o ponto exato nunca aparece para ninguém.`
      : "Não conseguimos achar sua localização. Confira se o GPS está ligado e tente de novo.";

  return (
    <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
        <MapPinOff size={22} color={colors.primary} />
      </View>
      <Text className="text-center font-sans text-sm text-foreground">{message}</Text>
      {blocked ? (
        <>
          <Text className="text-center font-sans text-xs text-muted-foreground">
            O acesso foi bloqueado. Libere a localização para o Miaucha nas configurações do aparelho.
          </Text>
          {onOpenSettings ? <PrimaryButton title="Abrir configurações" variant="primary" onPress={onOpenSettings} /> : null}
        </>
      ) : null}
      <PrimaryButton title="Tentar de novo" variant="outline" onPress={onRetry} />
    </View>
  );
}
