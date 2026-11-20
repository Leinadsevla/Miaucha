import type { LatLng } from "@miaucha/shared";

export type AlertButton = { text: string; style?: "cancel"; onPress?: () => void };

type Deps = {
  platform: string;
  alert: (title: string, message: string, buttons: AlertButton[]) => void;
  openURL: (url: string) => Promise<unknown>;
};

/**
 * MP-06: links universais de rota. Abrem o app instalado ou, sem ele, o navegador.
 * O destino é sempre o ponto PÚBLICO (MP-07): o app nem conhece o ponto exato.
 */
export function directionsOptions({ lat, lng }: LatLng, platform: string) {
  const at = `${lat},${lng}`;
  const options = [
    { label: "Google Maps", url: `https://www.google.com/maps/dir/?api=1&destination=${at}` },
    { label: "Waze", url: `https://waze.com/ul?ll=${at}&navigate=yes` },
  ];
  return platform === "ios" ? [{ label: "Apple Maps", url: `https://maps.apple.com/?daddr=${at}` }, ...options] : options;
}

export function openDirections(point: LatLng, { platform, alert, openURL }: Deps) {
  const buttons: AlertButton[] = directionsOptions(point, platform).map(({ label, url }) => ({
    text: label,
    onPress: () => void openURL(url).catch(() => {}),
  }));
  alert("Como chegar", "O destino é a região aproximada do registro, não o ponto exato.", [
    ...buttons,
    { text: "Cancelar", style: "cancel" },
  ]);
}
