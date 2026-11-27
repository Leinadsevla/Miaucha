import { Text, View } from "react-native";
import { CheckCircle2, Trash2 } from "lucide-react-native";
import { colors } from "@miaucha/shared";
import { PrimaryButton } from "@/components";

type Props = {
  resolved: boolean;
  onResolve: () => void;
  onDelete: () => void;
  /** Ação em andamento: a dela mostra o carregando e as duas ficam travadas. */
  busy?: "resolve" | "delete";
  error?: string;
};

/** Fim da tela de edição: finalizar (resolvida, sai do mapa e da lista) ou apagar de vez. */
export function OccurrenceManageActions({ resolved, onResolve, onDelete, busy, error }: Props) {
  return (
    <View className="mt-8 gap-3 border-t border-border pt-6">
      {error ? <Text className="text-center font-ui-semibold text-sm text-lost-deep">{error}</Text> : null}
      {resolved ? null : (
        <>
          <PrimaryButton
            title="Marcar como resolvida"
            variant="soft"
            onPress={onResolve}
            loading={busy === "resolve"}
            disabled={!!busy}
            icon={<CheckCircle2 size={18} color={colors.foreground} />}
          />
          <Text className="text-center font-sans text-xs text-muted-foreground">
            A ocorrência sai do mapa e da lista, mas continua no seu histórico.
          </Text>
        </>
      )}
      <PrimaryButton
        title="Apagar ocorrência"
        variant="outline"
        onPress={onDelete}
        loading={busy === "delete"}
        disabled={!!busy}
        icon={<Trash2 size={18} color={colors.lostDeep} />}
      />
    </View>
  );
}
