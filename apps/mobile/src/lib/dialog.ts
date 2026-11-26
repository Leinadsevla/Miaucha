import { Alert } from "react-native";
import type { DialogButton, DialogOptions } from "./webDialog";

export type { DialogButton, DialogOptions };

/** Diálogo do sistema. No navegador, `dialog.web.ts` troca por `confirm`/`alert` (o Alert do RN Web não faz nada). */
export function showAlert(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
  Alert.alert(title, message, buttons, options);
}
