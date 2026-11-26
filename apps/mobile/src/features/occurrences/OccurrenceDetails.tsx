import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2, ChevronLeft, Clock, Eye, MapPin, Pencil, MessageCircle, Navigation, Palette, PawPrint, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, elevation, speciesLabel, formatTimeAgo, occurrenceStyle, withAlpha, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import { Card, IconButton, PhotoCarousel, PrimaryButton, SectionLabel, SpeciesIcon, StatusBadge } from "@/components";

const PHOTO_HEIGHT = 320;
const NOT_INFORMED = "Não informado";

type Props = {
  occurrence: PublicOccurrence;
  onBack: () => void;
  /** MP-06: recebe o ponto público (o app não conhece o exato). */
  onDirections: (point: LatLng) => void;
  onResolve: () => void;
  resolving?: boolean;
  resolveError?: string;
  /** Abre (ou reabre) a conversa com quem registrou (CH-01). */
  onChat: () => void;
  /** Abre a edição (só o autor, enquanto aberta). */
  onEdit?: () => void;
  /** "Vi este pet": registrar um avistamento ligado a este pet perdido (o tutor é avisado). */
  onReportSighting?: () => void;
  chatLoading?: boolean;
  chatError?: string;
  now?: Date;
};

/** "Thor" ou, sem nome, "Gato avistado". */
export function occurrenceTitle(o: Pick<PublicOccurrence, "petName" | "species" | "type">): string {
  if (o.petName) return o.petName;
  return `${speciesLabel(o.species)} ${occurrenceStyle(o.type).label.toLowerCase()}`;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <Card className="w-[48%] gap-1 p-3.5">
      <View className="mb-1 h-9 w-9 items-center justify-center rounded-xl bg-primary-soft">{icon}</View>
      <Text className="font-sans text-xs text-muted-foreground">{label}</Text>
      <Text className="font-nunito-bold text-sm text-foreground">{value || NOT_INFORMED}</Text>
    </Card>
  );
}

/** Detalhe público da ocorrência (PetDetailsScreen do protótipo): pseudônimo do autor e local aproximado. */
export function OccurrenceDetails({
  occurrence: o,
  onBack,
  onDirections,
  onResolve,
  resolving,
  resolveError,
  onChat,
  onReportSighting,
  onEdit,
  chatLoading,
  chatError,
  now = new Date(),
}: Props) {
  const insets = useSafeAreaInsets();
  const title = occurrenceTitle(o);
  const subtitle = [o.breed, o.color].filter(Boolean).join(" · ");
  const timeAgo = formatTimeAgo(new Date(o.createdAt), now);
  const resolved = o.status === "resolved";

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={{ height: PHOTO_HEIGHT }} className="bg-muted">
          {o.photoUrls.length > 0 ? (
            <PhotoCarousel urls={o.photoUrls} label={title} height={PHOTO_HEIGHT} />
          ) : (
            <View accessibilityLabel={`${title} ainda não tem foto`} className="flex-1 items-center bg-primary-soft" style={{ paddingTop: 72 }}>
              <SpeciesIcon species={o.species} size={96} color={colors.primaryDeep} />
            </View>
          )}

          <LinearGradient
            pointerEvents="none"
            colors={[withAlpha(colors.foreground, 0), withAlpha(colors.foreground, 0.8)]}
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20, paddingTop: 48, gap: 6 }}
          >
            <StatusBadge type={o.type} size="lg" />
            <Text accessibilityRole="header" className="font-nunito-black text-[28px] leading-9 text-white">
              {title}
            </Text>
            {subtitle ? <Text className="font-nunito-semibold text-sm text-white">{subtitle}</Text> : null}
          </LinearGradient>

          <View className="absolute left-4" style={{ top: insets.top + 12 }}>
            <IconButton label="Voltar" tone="overlay" icon={<ChevronLeft size={22} color={colors.white} />} onPress={onBack} />
          </View>
        </View>

        <View className="gap-4 px-5 pt-5">
          {resolved ? (
            <View className="flex-row items-center gap-2 rounded-2xl p-3.5" style={{ backgroundColor: withAlpha(colors.found, 0.15) }}>
              <CheckCircle2 size={18} color={colors.found} />
              <Text className="font-nunito-bold text-sm text-foreground">Este caso foi resolvido</Text>
            </View>
          ) : null}

          <Card className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
              <UserRound size={22} color={colors.primaryDeep} />
            </View>
            <View className="flex-1">
              <Text className="font-sans text-xs text-muted-foreground">Registrado por</Text>
              <Text className="font-nunito-black text-base text-foreground">{o.authorPseudonym}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Clock size={13} color={colors.accent} />
                <Text className="font-sans text-xs text-muted-foreground">{timeAgo}</Text>
              </View>
            </View>
          </Card>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <Info icon={<SpeciesIcon species={o.species} size={18} color={colors.primaryDeep} />} label="Espécie" value={speciesLabel(o.species)} />
            <Info icon={<PawPrint size={18} color={colors.primaryDeep} />} label="Raça" value={o.breed} />
            <Info icon={<Palette size={18} color={colors.primaryDeep} />} label="Cor" value={o.color} />
            <Info icon={<Clock size={18} color={colors.primaryDeep} />} label="Registrado" value={timeAgo} />
          </View>

          {o.description ? (
            <Card>
              <SectionLabel>Descrição</SectionLabel>
              <Text className="font-sans text-base leading-6 text-foreground">{o.description}</Text>
            </Card>
          ) : null}

          <Card className="gap-3">
            <View className="flex-row items-start gap-2">
              <MapPin size={18} color={colors.accent} />
              <View className="flex-1">
                <Text className="font-nunito-bold text-xs uppercase text-muted-foreground">
                  {o.type === "lost" ? "Último local visto" : "Onde foi"}
                </Text>
                <Text className="font-nunito-semibold text-sm text-foreground">{o.approxAddress || "Região aproximada no mapa"}</Text>
                <Text className="mt-1 font-sans text-xs text-muted-foreground">
                  Local aproximado (~150 m), para proteger quem registrou.
                </Text>
              </View>
            </View>
            <PrimaryButton
              title="Como chegar"
              variant="outline"
              onPress={() => onDirections(o.publicLocation)}
              icon={<Navigation size={16} color={colors.foreground} />}
            />
          </Card>

          {o.type === "lost" && !o.isMine && !resolved && onReportSighting ? (
            <PrimaryButton
              title="Vi este pet"
              variant="primary"
              onPress={onReportSighting}
              icon={<Eye size={18} color={colors.foreground} />}
            />
          ) : null}

          {o.isMine && !resolved && onEdit ? (
            <PrimaryButton title="Editar" variant="outline" onPress={onEdit} icon={<Pencil size={16} color={colors.foreground} />} />
          ) : null}

          {o.isMine && !resolved ? (
            <>
              {resolveError ? <Text className="text-center font-nunito-semibold text-sm text-lost">{resolveError}</Text> : null}
              <PrimaryButton
                title="Marcar como resolvido"
                variant="primary"
                onPress={onResolve}
                loading={resolving}
                icon={<CheckCircle2 size={18} color={colors.foreground} />}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View className="gap-1.5 border-t border-border bg-white px-5 pt-3" style={[{ paddingBottom: insets.bottom + 12 }, elevation.raised]}>
        {chatError ? <Text className="text-center font-nunito-semibold text-sm text-lost">{chatError}</Text> : null}
        <PrimaryButton
          title="Conversar"
          onPress={onChat}
          disabled={o.isMine}
          loading={chatLoading}
          icon={<MessageCircle size={18} color={colors.white} />}
        />
        <Text className="text-center font-sans text-xs text-muted-foreground">
          {o.isMine ? "Esta ocorrência é sua: as conversas aparecem na aba Chat" : `Converse com ${o.authorPseudonym} sem expor seu contato`}
        </Text>
      </View>
    </View>
  );
}
