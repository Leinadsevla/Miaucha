import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { cn } from "@/lib/cn";

export type Consent = { privacyPolicy: boolean; approximateLocation: boolean };

type Props = {
  onAccept: (consent: Consent) => void;
  onOpenPolicy: () => void;
};

/** NF-01: consentimento explícito antes de usar a localização. */
export function ConsentForm({ onAccept, onOpenPolicy }: Props) {
  const [consent, setConsent] = useState<Consent>({ privacyPolicy: false, approximateLocation: false });
  const toggle = (key: keyof Consent) => setConsent((c) => ({ ...c, [key]: !c[key] }));

  return (
    <View className="gap-4">
      <CheckRow
        checked={consent.privacyPolicy}
        onToggle={() => toggle("privacyPolicy")}
        label="Li e aceito a política de privacidade"
      />
      <Pressable accessibilityRole="link" accessibilityLabel="Ler a política de privacidade" onPress={onOpenPolicy}>
        <Text className="ml-9 font-nunito-bold text-xs text-primary">Ler a política de privacidade</Text>
      </Pressable>
      <CheckRow
        checked={consent.approximateLocation}
        onToggle={() => toggle("approximateLocation")}
        label="Autorizo o uso da minha localização aproximada (cerca de 1 km) para receber alertas de pets perto de mim"
      />
      <Text className="ml-9 font-sans text-xs text-muted-foreground">
        Nunca guardamos seu trajeto. Você pode mudar isso ou excluir sua conta a qualquer momento no Perfil.
      </Text>
      <PrimaryButton
        title="Continuar"
        onPress={() => onAccept(consent)}
        disabled={!consent.privacyPolicy || !consent.approximateLocation}
      />
    </View>
  );
}

function CheckRow({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onToggle}
      className="flex-row items-start gap-3"
    >
      <View
        className={cn(
          "h-6 w-6 items-center justify-center rounded-lg border-2",
          checked ? "border-primary bg-primary" : "border-border bg-white",
        )}
      >
        {checked ? <Check size={14} color={colors.white} /> : null}
      </View>
      <Text className="flex-1 font-nunito-semibold text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}
