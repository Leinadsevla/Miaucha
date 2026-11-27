import { Linking, Platform } from "react-native";
import { showAlert } from "./dialog";

/** No navegador não há "configurações do app": a permissão fica no cadeado da barra de endereço. */
export const WEB_LOCATION_HELP =
  "Clique no cadeado ao lado do endereço do site, permita a localização para este site e recarregue a página.";

type Deps = {
  os: string;
  Linking: { openSettings(): Promise<unknown> };
  alert: (title: string, message: string) => void;
};

export function createOpenSettings({ os, Linking: linking, alert }: Deps) {
  return () => {
    if (os === "web") alert("Liberar a localização", WEB_LOCATION_HELP);
    else void linking.openSettings();
  };
}

/** Abre as configurações do app (aparelho) ou explica como liberar a localização (navegador). */
export const openAppSettings = createOpenSettings({ os: Platform.OS, Linking, alert: (title, message) => showAlert(title, message) });
