import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { CheckCircle2, ChevronLeft, Clock, MapPin, MessageCircle, Navigation, Palette, PawPrint, UserRound } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, formatTimeAgo, occurrenceStyle, type LatLng, type PublicOccurrence } from "@miaucha/shared";
import { Card, PrimaryButton, SectionLabel, SpeciesIcon, StatusBadge } from "@/components";

const PHOTO_HEIGHT = 288;
const OVERLAY = "rgba(0, 0, 0, 0.35)";
const NOT_INFORMED = "Não informado";

type Props = {
  occurrence: PublicOccurrence;
  onBack: () => void;
  /** MP-06: recebe o ponto público (o app não conhece o exato). */
  onDirections: (point: LatLng) => void;
  onResolve: () => void;
  resolving?: boolean;
  resolveError?: string;
  now?: Date;
};

/** "Thor" ou, sem nome, "Gato avistado". */
export function occurrenceTitle(o: Pick<PublicOccurrence, "petName" | "species" | "type">): string {
  if (o.petName) return o.petName;
  return `${o.species === "dog" ? "Cão" : "Gato"} ${occurrenceStyle(o.type).label.toLowerCase()}`;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <Card className="w-[48%] gap-1 p-3">
      {icon}
      <Text className="font-sans text-xs text-muted-foreground">{label}</Text>
      <Text className="font-nunito-bold text-sm text-foreground">{value || NOT_INFORMED}</Text>
    </Card>
  );
}

/** Detalhe público da ocorrência (PetDetailsScreen do protótipo): pseudônimo do autor e local aproximado. */
export function OccurrenceDetails({ occurrence: o, onBack, onDirections, onResolve, resolving, resolveError, now = new Date() }: Props) {
  const { width } = useWindowDimensions();
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
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {o.photoUrls.map((url, i) => (
                <Image
                  key={url}
                  accessibilityLabel={`Foto ${i + 1} de ${o.photoUrls.length} de ${title}`}
                  source={{ uri: url }}
                  contentFit="cover"
                  style={{ width, height: PHOTO_HEIGHT }}
                />
              ))}
            </ScrollView>
          ) : (
            <View accessibilityLabel={`${title} ainda não tem foto`} className="flex-1 items-center justify-center">
              <SpeciesIcon species={o.species} size={72} color={colors.mutedForeground} />
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={onBack}
            style={{ top: insets.top + 12, backgroundColor: OVERLAY }}
            className="absolute left-4 h-10 w-10 items-center justify-center rounded-2xl"
          >
            <ChevronLeft size={20} color={colors.white} />
          </Pressable>

          <View pointerEvents="none" style={{ backgroundColor: OVERLAY }} className="absolute bottom-0 left-0 right-0 gap-1 px-5 pb-4 pt-3">
            <View className="self-start rounded-full bg-white">
              <StatusBadge type={o.type} />
            </View>
            <Text accessibilityRole="header" className="font-nunito-black text-2xl text-white">
              {title}
            </Text>
            {subtitle ? <Text className="font-sans text-sm text-white">{subtitle}</Text> : null}
            {o.photoUrls.length > 1 ? <Text className="font-sans text-xs text-white">Deslize para ver as {o.photoUrls.length} fotos</Text> : null}
          </View>
        </View>

        <View className="gap-3 px-5 pt-4">
          {resolved ? (
            <View className="flex-row items-center gap-2 rounded-2xl p-3" style={{ backgroundColor: `${colors.found}1F` }}>
              <CheckCircle2 size={18} color={colors.found} />
              <Text className="font-nunito-bold text-sm text-foreground">Este caso foi resolvido</Text>
            </View>
          ) : null}

          <Card className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft">
              <UserRound size={22} color={colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="font-sans text-xs text-muted-foreground">Registrado por</Text>
              <Text className="font-nunito-bold text-sm text-foreground">{o.authorPseudonym}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Clock size={11} color={colors.accent} />
                <Text className="font-sans text-xs text-muted-foreground">{timeAgo}</Text>
              </View>
            </View>
          </Card>

          <View className="flex-row flex-wrap justify-between gap-y-3">
            <Info icon={<SpeciesIcon species={o.species} size={18} color={colors.primary} />} label="Espécie" value={o.species === "dog" ? "Cão" : "Gato"} />
            <Info icon={<PawPrint size={18} color={colors.primary} />} label="Raça" value={o.breed} />
            <Info icon={<Palette size={18} color={colors.primary} />} label="Cor" value={o.color} />
            <Info icon={<Clock size={18} color={colors.primary} />} label="Registrado" value={timeAgo} />
          </View>

          {o.description ? (
            <Card>
              <SectionLabel>Descrição</SectionLabel>
              <Text className="font-sans text-sm text-foreground">{o.description}</Text>
            </Card>
          ) : null}

          <Card className="gap-3">
            <View className="flex-row items-start gap-2">
              <MapPin size={14} color={colors.accent} />
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

          {o.isMine && !resolved ? (
            <>
              {resolveError ? <Text className="text-center font-nunito-semibold text-sm text-lost">{resolveError}</Text> : null}
              <PrimaryButton
                title="Marcar como resolvido"
                variant="primary"
                onPress={onResolve}
                loading={resolving}
                icon={<CheckCircle2 size={16} color={colors.white} />}
              />
            </>
          ) : null}
        </View>
      </ScrollView>

      <View className="gap-1 border-t border-border bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
        <PrimaryButton title="Conversar" onPress={() => {}} disabled icon={<MessageCircle size={16} color={colors.white} />} />
        <Text className="text-center font-sans text-xs text-muted-foreground">Chat em breve</Text>
      </View>
    </View>
  );
}
