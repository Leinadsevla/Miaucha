import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Bell, ChevronRight, Heart, HelpCircle, LogOut, MapPin, ShieldCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation, speciesLabel, formatTimeAgo, withAlpha, type MyPet, type PublicOccurrence } from "@miaucha/shared";
import { Card, SpeciesIcon, StatusBadge } from "@/components";
import { MyPetsCard } from "@/features/pets/MyPetsCard";
import type { MyProfile } from "./profileClient";
import { centered, READING_MAX_WIDTH } from "@/lib/layout";

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


/** Aba Perfil (protótipo `ProfileScreen`): nome, pseudônimo público, contadores, pets, ocorrências e configurações. */
export function ProfileView(p: Props) {
  const insets = useSafeAreaInsets();
  const stats = [
    { value: p.profile?.petCount, one: "pet", many: "pets", label: "Pets" },
    { value: p.profile?.occurrenceCount, one: "ocorrência", many: "ocorrências", label: "Ocorrências" },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="items-center gap-3 border-b border-border bg-white px-5 pb-6" style={{ paddingTop: insets.top + 24 }}>
        <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-soft">
          <Text className="font-ui-extrabold text-4xl text-brand-deep">{p.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="items-center">
          <Text accessibilityRole="header" className="font-ui-extrabold text-2xl tracking-tight text-foreground">
            {p.name}
          </Text>
          {p.profile ? (
            <View className="mt-1.5 flex-row items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <Text className="font-sans text-xs text-muted-foreground">Nome público</Text>
              <Text className="font-ui-bold text-sm text-foreground">{p.profile.pseudonym}</Text>
            </View>
          ) : null}
        </View>
        <View className="mt-1 flex-row gap-3">
          {stats.map((s) => (
            <View
              key={s.label}
              className="min-w-[104px] items-center rounded-2xl border border-border bg-background px-4 py-2.5"
              accessible
              accessibilityLabel={s.value === undefined ? s.label : `${s.value} ${s.value === 1 ? s.one : s.many}`}
            >
              <Text className="font-ui-extrabold text-2xl text-foreground">{s.value ?? "–"}</Text>
              <Text className="font-ui-semibold text-xs text-muted-foreground">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View className="gap-4 p-5" style={centered(READING_MAX_WIDTH)}>
        <MyPetsCard pets={p.pets} error={p.petsError} onAdd={p.onAddPet} onOpen={p.onOpenPet} />

        <Card>
          <Text accessibilityRole="header" className="mb-3 font-ui-extrabold text-base text-foreground">
            Minhas ocorrências
          </Text>
          {p.occurrencesError ? (
            <Text className="font-ui-semibold text-sm text-lost">{p.occurrencesError}</Text>
          ) : p.occurrences === null ? (
            <Text className="font-sans text-sm text-muted-foreground">Carregando ocorrências...</Text>
          ) : p.occurrences.length === 0 ? (
            <Text className="font-sans text-sm text-muted-foreground">Você ainda não registrou nenhuma ocorrência</Text>
          ) : (
            <View className="gap-2">
              {p.occurrences.map((o) => {
                const title = o.petName ?? `${speciesLabel(o.species)} sem nome`;
                return (
                  <Pressable
                    key={o.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}${o.status === "resolved" ? ", resolvida" : ""}`}
                    onPress={() => p.onOpenOccurrence(o.id)}
                    className="flex-row items-center gap-3 rounded-2xl bg-muted px-3 py-2.5 active:opacity-70"
                    style={{ minHeight: 56 }}
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <SpeciesIcon species={o.species} size={18} color={colors.foreground} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-ui-bold text-sm text-foreground">{title}</Text>
                      <Text className="font-sans text-xs text-muted-foreground">{formatTimeAgo(new Date(o.createdAt), p.now)}</Text>
                    </View>
                    {o.status === "resolved" ? (
                      <View className="rounded-lg bg-found px-2 py-1">
                        <Text className="font-ui-extrabold text-xs uppercase text-foreground">Resolvida</Text>
                      </View>
                    ) : (
                      <StatusBadge type={o.type} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        <View className="overflow-hidden rounded-3xl border border-border bg-card" style={elevation.card}>
          <SettingsItem icon={<Bell size={18} color={colors.brand} />} tint={colors.brandSoft} label="Notificações" onPress={p.onOpenAlertPreferences} />
          <SettingsItem icon={<MapPin size={18} color={colors.brand} />} tint={colors.brandSoft} label="Localização" onPress={p.onOpenAlertPreferences} />
          <SettingsItem icon={<ShieldCheck size={18} color={colors.foreground} />} tint={colors.muted} label="Política de privacidade" onPress={p.onOpenPrivacy} />
          <SettingsItem icon={<HelpCircle size={18} color={colors.brand} />} tint={colors.brandSoft} label="Ajuda" onPress={p.onOpenHelp} />
          <SettingsItem icon={<LogOut size={18} color={colors.lost} />} tint={withAlpha(colors.lost, 0.1)} label="Sair da conta" onPress={p.onLogout} last />
        </View>

        <View className="flex-row items-center justify-center gap-1.5 py-2">
          <Text className="font-sans text-xs text-muted-foreground">Miaucha v1.0.0 · Feito com</Text>
          <Heart size={12} color={colors.lost} fill={colors.lost} accessibilityLabel="carinho" />
          <Text className="font-sans text-xs text-muted-foreground">para pets e tutores</Text>
        </View>
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
      className={last ? "flex-row items-center gap-3 px-4 active:bg-muted" : "flex-row items-center gap-3 border-b border-border px-4 active:bg-muted"}
      style={{ minHeight: 60 }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: tint }}>
        {icon}
      </View>
      <Text className="flex-1 font-ui-bold text-base text-foreground">{label}</Text>
      <ChevronRight size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}
