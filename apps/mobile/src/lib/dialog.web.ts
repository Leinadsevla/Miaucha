import { runWebDialog, type DialogButton, type DialogOptions } from "./webDialog";

export type { DialogButton, DialogOptions };

export function showAlert(title: string, message?: string, buttons?: DialogButton[], options?: DialogOptions) {
  runWebDialog(title, message, buttons, options, window);
}
