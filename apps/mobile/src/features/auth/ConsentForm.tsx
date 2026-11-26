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
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Ler a política de privacidade"
        onPress={onOpenPolicy}
        style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", marginTop: -12, opacity: pressed ? 0.6 : 1 })}
      >
        <Text className="ml-9 font-ui-bold text-sm text-brand">Ler a política de privacidade</Text>
      </Pressable>
      <CheckRow
        checked={consent.approximateLocation}
        onToggle={() => toggle("approximateLocation")}
        label="Autorizo o uso da minha localização aproximada (cerca de 1 km) para receber alertas de pets perto de mim"
      />
      <Text className="ml-9 font-sans text-xs leading-4 text-muted-foreground">
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
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 44, paddingVertical: 4, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        className={cn(
          "h-6 w-6 items-center justify-center rounded-lg border-2",
          checked ? "border-brand bg-brand" : "border-border bg-white",
        )}
      >
        {checked ? <Check size={15} strokeWidth={3} color={colors.white} /> : null}
      </View>
      <Text className="flex-1 font-ui-semibold text-sm leading-5 text-foreground">{label}</Text>
    </Pressable>
  );
}
