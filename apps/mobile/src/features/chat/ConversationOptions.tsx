import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ban, Flag, Share2 } from "lucide-react-native";
import { CHAT_REPORT_DETAILS_MAX_LENGTH, CHAT_REPORT_REASONS, colors, type ChatConversation, type ChatReportReason } from "@miaucha/shared";
import { PrimaryButton } from "@/components";
import { cn } from "@/lib/cn";

type Props = {
  conversation: ChatConversation;
  busy: boolean;
  onToggleContact: () => void;
  onToggleBlock: () => void;
  onReport: (reason: ChatReportReason, details: string) => Promise<boolean>;
};

/** Menu da conversa: compartilhar contato (CH-07), bloquear e denunciar (CH-08). */
export function ConversationOptions({ conversation: c, busy, onToggleContact, onToggleBlock, onReport }: Props) {
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<ChatReportReason>();
  const [details, setDetails] = useState("");

  if (reporting) {
    return (
      <View className="gap-2 border-b border-border bg-white px-4 py-3">
        <Text className="font-ui-bold text-sm text-foreground">Por que você quer denunciar?</Text>
        {CHAT_REPORT_REASONS.map((r) => (
          <Pressable
            key={r.value}
            accessibilityRole="button"
            accessibilityLabel={r.label}
            accessibilityState={{ selected: reason === r.value }}
            onPress={() => setReason(r.value)}
            className={cn("justify-center rounded-xl border-2 px-3", reason === r.value ? "border-brand bg-brand-soft" : "border-border bg-white")}
            style={{ minHeight: 44 }}
          >
            <Text className="font-ui-semibold text-sm text-foreground">{r.label}</Text>
          </Pressable>
        ))}
        <TextInput
          accessibilityLabel="Detalhes (opcional)"
          placeholder="Detalhes (opcional)"
          placeholderTextColor={colors.mutedForeground}
          value={details}
          onChangeText={setDetails}
          maxLength={CHAT_REPORT_DETAILS_MAX_LENGTH}
          multiline
          className="min-h-16 rounded-xl bg-muted px-3 py-2 font-sans text-sm text-foreground"
        />
        <PrimaryButton
          title="Enviar denúncia"
          variant="soft"
          disabled={!reason}
          loading={busy}
          onPress={async () => {
            if (reason && (await onReport(reason, details.trim()))) setReporting(false);
          }}
        />
        <PrimaryButton title="Cancelar" variant="outline" onPress={() => setReporting(false)} />
      </View>
    );
  }

  return (
    <View className="gap-1 border-b border-border bg-white px-4 py-2">
      <Option
        icon={<Share2 size={16} color={colors.brand} />}
        label={c.contact.mine ? "Parar de compartilhar contato" : "Compartilhar meu contato"}
        onPress={onToggleContact}
      />
      <Option icon={<Ban size={16} color={colors.lost} />} label={c.blockedByMe ? "Desbloquear" : "Bloquear"} onPress={onToggleBlock} />
      <Option icon={<Flag size={16} color={colors.lost} />} label="Denunciar" onPress={() => setReporting(true)} />
    </View>
  );
}

function Option({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="flex-row items-center gap-3 rounded-xl px-2 active:bg-muted" style={{ minHeight: 48 }}>
      {icon}
      <Text className="font-ui-semibold text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}
