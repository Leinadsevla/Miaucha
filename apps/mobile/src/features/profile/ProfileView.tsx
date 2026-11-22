import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Bell, ChevronRight, HelpCircle, LogOut, MapPin, ShieldCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, formatTimeAgo, type MyPet, type PublicOccurrence } from "@miaucha/shared";
import { Card, SpeciesIcon, StatusBadge } from "@/components";
import { MyPetsCard } from "@/features/pets/MyPetsCard";
import type { MyProfile } from "./profileClient";

type Props = {
  name: string;
  /** null enquanto carrega (ou se falhou: os contadores ficam com traço). */
  profile: MyProfile | null;
  pets: MyPet[] | null;
  petsError?: string;
  occurrences: PublicOccurrence[] | null;
  occurrencesError?: string;
  now?: Date;
  onAddPet: () => void;
  onOpenPet: (id: string) => void;
  onOpenOccurrence: (id: string) => void;
  onOpenAlertPreferences: () => void;
  onOpenPrivacy: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
};

const SPECIES_NAME = { dog: "Cão", cat: "Gato" } as const;

/** Aba Perfil (protótipo `ProfileScreen`): nome, pseudônimo público, contadores, pets, ocorrências e configurações. */
export function ProfileView(p: Props) {
  const insets = useSafeAreaInsets();
  const stats = [
    { value: p.profile?.petCount, one: "pet", many: "pets", label: "Pets" },
    { value: p.profile?.occurrenceCount, one: "ocorrência", many: "ocorrências", label: "Ocorrências" },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="items-center gap-3 bg-primary px-5 pb-8" style={{ paddingTop: insets.top + 24 }}>
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-white/20">
          <Text className="font-nunito-black text-3xl text-white">{p.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="items-center">
          <Text className="font-nunito-black text-lg text-white">{p.name}</Text>
          {p.profile ? (
            <>
              <Text className="font-sans text-xs text-white/70">Nome público</Text>
              <Text className="font-nunito-bold text-sm text-white">{p.profile.pseudonym}</Text>
            </>
          ) : null}
        </View>
        <View className="mt-1 flex-row gap-8">
          {stats.map((s) => (
            <View
              key={s.label}
              className="items-center"
              accessible
              accessibilityLabel={s.value === undefined ? s.label : `${s.value} ${s.value === 1 ? s.one : s.many}`}
            >
              <Text className="font-nunito-black text-xl text-white">{s.value ?? "–"}</Text>
              <Text className="font-sans text-xs text-white/70">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-3 p-5">
        <MyPetsCard pets={p.pets} error={p.petsError} onAdd={p.onAddPet} onOpen={p.onOpenPet} />

        <Card>
          <Text className="mb-3 font-nunito-black text-sm text-foreground">Minhas ocorrências</Text>
          {p.occurrencesError ? (
            <Text className="font-sans text-xs text-lost">{p.occurrencesError}</Text>
          ) : p.occurrences === null ? (
            <Text className="font-sans text-xs text-muted-foreground">Carregando ocorrências...</Text>
          ) : p.occurrences.length === 0 ? (
            <Text className="font-sans text-xs text-muted-foreground">Você ainda não registrou nenhuma ocorrência</Text>
          ) : (
            <View className="gap-2">
              {p.occurrences.map((o) => {
                const title = o.petName ?? `${SPECIES_NAME[o.species]} sem nome`;
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}${o.status === "resolved" ? ", resolvida" : ""}`}
                    onPress={() => p.onOpenOccurrence(o.id)}
                    className="flex-row items-center gap-3 rounded-2xl bg-muted px-3 py-2 active:opacity-70"
                  >
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-white">
                      <SpeciesIcon species={o.species} size={16} color={colors.mutedForeground} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-nunito-bold text-xs text-foreground">{title}</Text>
                      <Text className="font-sans text-[10px] text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), p.now)}</Text>
                    </View>
                    {o.status === "resolved" ? (
                      <Text className="font-nunito-bold text-xs text-found">Resolvida</Text>
                    ) : (
                      <StatusBadge type={o.type} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        <View className="overflow-hidden rounded-3xl border border-border bg-card">
          <SettingsItem icon={<Bell size={16} color={colors.primary} />} tint={colors.primarySoft} label="Notificações" onPress={p.onOpenAlertPreferences} />
          <SettingsItem icon={<MapPin size={16} color={colors.accent} />} tint={colors.muted} label="Localização" onPress={p.onOpenAlertPreferences} />
          <SettingsItem icon={<ShieldCheck size={16} color={colors.foreground} />} tint={colors.muted} label="Política de privacidade" onPress={p.onOpenPrivacy} />
          <SettingsItem icon={<HelpCircle size={16} color={colors.found} />} tint={colors.muted} label="Ajuda" onPress={p.onOpenHelp} />
          <SettingsItem icon={<LogOut size={16} color={colors.lost} />} tint={colors.muted} label="Sair da conta" onPress={p.onLogout} last />
        </View>

        <Text className="py-2 text-center font-sans text-xs text-muted-foreground">Miaucha v1.0.0 · Feito com ❤️ para pets e tutores</Text>
      </View>
    </ScrollView>
  );
}

function SettingsItem({ icon, tint, label, onPress, last }: { icon: ReactNode; tint: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={last ? "flex-row items-center gap-3 px-4 py-3.5 active:bg-muted" : "flex-row items-center gap-3 border-b border-border px-4 py-3.5 active:bg-muted"}
    >
      <View className="h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: tint }}>
        {icon}
      </View>
      <Text className="flex-1 font-nunito-semibold text-sm text-foreground">{label}</Text>
      <ChevronRight size={14} color={colors.mutedForeground} />
    </Pressable>
  );
}
