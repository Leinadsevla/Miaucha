import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Switch, Text, View } from "react-native";
import { BellRing, MapPin, Moon, Smartphone } from "lucide-react-native";
import {
  ALERT_RADII_KM,
  colors,
  validateAlertPreferences,
  type AlertPreferences,
  type AlertPreferencesErrors,
  type AlertRadiusKm, elevation } from "@miaucha/shared";
import { Card, PrimaryButton, TextField } from "@/components";
import type { AlertsClient } from "./alertsClient";
import type { GeofencingAvailability } from "./geofencing";

const DEFAULT_QUIET = { start: "22:00", end: "07:00" };

type Props = {
  client: AlertsClient;
  /** Texto de `pushStatusMessage` (ou null enquanto não se sabe). */
  pushStatus: string | null;
  geofencing: GeofencingAvailability;
  onEnableGeofencing: () => void;
};

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ready" };

/** Tela de preferências de alerta: liga/desliga, raio (1, 3 ou 5 km) e horário de silêncio (AL-04). */
export function AlertPreferencesForm({ client, pushStatus, geofencing, onEnableGeofencing }: Props) {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [enabled, setEnabled] = useState(true);
  const [radiusKm, setRadiusKm] = useState<AlertRadiusKm>(3);
  const [quietOn, setQuietOn] = useState(false);
  const [quiet, setQuiet] = useState(DEFAULT_QUIET);
  const [errors, setErrors] = useState<AlertPreferencesErrors>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string }>();

  const fetchPrefs = useCallback(async () => {
    setLoad({ status: "loading" });
    try {
      const prefs = await client.getPreferences();
      setEnabled(prefs.enabled);
      setRadiusKm(prefs.radiusKm);
      setQuietOn(prefs.quietHours !== null);
      setQuiet(prefs.quietHours ?? DEFAULT_QUIET);
      setLoad({ status: "ready" });
    } catch (e) {
      setLoad({ status: "error", message: e instanceof Error ? e.message : "Não foi possível carregar as preferências" });
    }
  }, [client]);

  useEffect(() => {
    void fetchPrefs();
  }, [fetchPrefs]);

  async function save() {
    const prefs: AlertPreferences = { enabled, radiusKm, quietHours: quietOn ? { start: quiet.start.trim(), end: quiet.end.trim() } : null };
    const found = validateAlertPreferences(prefs);
    setErrors(found);
    setMessage(undefined);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      await client.savePreferences(prefs);
      setMessage({ kind: "ok", text: "Preferências salvas" });
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Algo deu errado. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  if (load.status === "loading") {
    return (
      <View className="items-center gap-3 py-10">
        <ActivityIndicator color={colors.primary} />
        <Text className="font-sans text-sm text-muted-foreground">Carregando preferências...</Text>
      </View>
    );
  }
  if (load.status === "error") {
    return (
      <View className="items-center gap-3 rounded-3xl border border-border bg-card p-5" style={elevation.card}>
        <Text className="text-center font-sans text-sm text-lost">{load.message}</Text>
        <PrimaryButton title="Tentar de novo" variant="outline" onPress={() => void fetchPrefs()} />
      </View>
    );
  }

  return (
    <View className="gap-3">
      <Card className="gap-4">
        <Row icon={<BellRing size={16} color={colors.primary} />} label="Receber alertas de pets por perto">
          <Switch
            accessibilityLabel="Receber alertas de pets por perto"
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <View>
          <Text className="mb-2 font-nunito-bold text-[13px] text-foreground">Raio dos alertas</Text>
          <View className="flex-row gap-2">
            {ALERT_RADII_KM.map((km) => (
              <Pressable
                key={km}
                accessibilityRole="button"
                accessibilityLabel={`${km} km`}
                accessibilityState={{ selected: radiusKm === km }}
                onPress={() => setRadiusKm(km)}
                className={radiusKm === km ? "flex-1 items-center justify-center rounded-xl bg-foreground" : "flex-1 items-center justify-center rounded-xl bg-muted"}
                style={{ minHeight: 44 }}
              >
                <Text className={radiusKm === km ? "font-nunito-black text-sm text-white" : "font-nunito-bold text-sm text-foreground"}>
                  {km} km
                </Text>
              </Pressable>
            ))}
          </View>
          {errors.radiusKm ? <Text className="mt-1 font-nunito-semibold text-xs text-lost">{errors.radiusKm}</Text> : null}
        </View>
      </Card>

      <Card className="gap-3">
        <Row icon={<Moon size={16} color={colors.accent} />} label="Horário de silêncio">
          <Switch
            accessibilityLabel="Horário de silêncio"
            value={quietOn}
            onValueChange={setQuietOn}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </Row>
        <Text className="font-sans text-xs text-muted-foreground">
          Nesse horário os alertas não tocam no celular, mas continuam aparecendo na aba Alertas. Horário de Brasília.
        </Text>
        {quietOn ? (
          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField label="Início" value={quiet.start} onChangeText={(start) => setQuiet((q) => ({ ...q, start }))} placeholder="22:00" maxLength={5} error={errors.quietStart} />
            </View>
            <View className="flex-1">
              <TextField label="Fim" value={quiet.end} onChangeText={(end) => setQuiet((q) => ({ ...q, end }))} placeholder="07:00" maxLength={5} error={errors.quietEnd} />
            </View>
          </View>
        ) : null}
      </Card>

      {message ? (
        <Text className={message.kind === "ok" ? "text-center font-nunito-semibold text-sm text-foreground" : "text-center font-nunito-semibold text-sm text-lost"}>
          {message.text}
        </Text>
      ) : null}
      <PrimaryButton title="Salvar preferências" onPress={() => void save()} loading={saving} />

      <Card className="gap-2">
        <Row icon={<MapPin size={16} color={colors.accent} />} label="Localização" />
        <Text className="font-sans text-xs text-muted-foreground">
          Para avisar sobre pets perto de você, o Miaucha guarda só a sua região aproximada (cerca de 1 km), nunca o ponto exato nem o
          caminho que você faz. A região é atualizada com o app aberto, quando você muda de bairro.
        </Text>
      </Card>

      <Card className="gap-2">
        <Row icon={<BellRing size={16} color={colors.primary} />} label="Notificações" />
        <Text className="font-sans text-xs text-muted-foreground">{pushStatus ?? "Verificando as notificações..."}</Text>
      </Card>

      <Card className="gap-2">
        <Row icon={<Smartphone size={16} color={colors.foreground} />} label="Alertas com o app fechado" />
        {geofencing === "enabled" ? (
          <>
            <Text className="font-sans text-xs text-muted-foreground">
              Para avisar quando você passar perto de um pet perdido, mesmo com o app fechado, o celular precisa da permissão de
              localização "sempre". O monitoramento acontece no próprio aparelho: nada do seu trajeto é enviado. Você pode desligar
              nas configurações a qualquer momento.
            </Text>
            <PrimaryButton title="Ativar alertas com o app fechado" variant="outline" onPress={onEnableGeofencing} />
          </>
        ) : (
          <Text className="font-sans text-xs text-muted-foreground">
            Este recurso precisa do development build do app (não funciona no Expo Go). Enquanto isso, você recebe os alertas de casos
            novos pelo servidor.
          </Text>
        )}
      </Card>
    </View>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children?: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary-soft">{icon}</View>
      <Text className="flex-1 font-nunito-black text-base text-foreground">{label}</Text>
      {children}
    </View>
  );
}
