import { Platform, Text, View } from "react-native";
import { MapPinOff } from "lucide-react-native";
import { colors, elevation } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { WEB_LOCATION_HELP } from "@/lib/settings";
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
    <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5" style={elevation.card}>
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft">
        <MapPinOff size={22} color={colors.brand} />
      </View>
      <Text className="text-center font-sans text-sm leading-5 text-foreground">{message}</Text>
      {/* O navegador não diz quando a localização foi bloqueada: a dica fica sempre visível. */}
      {Platform.OS === "web" && result.status === "denied" ? (
        <Text className="text-center font-sans text-xs text-muted-foreground">{WEB_LOCATION_HELP}</Text>
      ) : null}
      {blocked ? (
        <>
          <Text className="text-center font-sans text-xs text-muted-foreground">
            O acesso foi bloqueado. Libere a localização para o Miaucha nas configurações do aparelho.
          </Text>
          {onOpenSettings ? <PrimaryButton title="Abrir configurações" variant="soft" onPress={onOpenSettings} /> : null}
        </>
      ) : null}
      <PrimaryButton title="Tentar de novo" variant="outline" onPress={onRetry} />
    </View>
  );
}
