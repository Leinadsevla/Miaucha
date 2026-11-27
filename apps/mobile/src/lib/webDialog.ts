/** Botão de diálogo no formato do `Alert.alert` do React Native. */
export type DialogButton = { text: string; style?: "cancel" | "destructive" | "default"; onPress?: () => void };
export type DialogOptions = { cancelable?: boolean; onDismiss?: () => void };
type Browser = { confirm(text: string): boolean; alert(text: string): void };

/**
 * `Alert.alert` não faz nada no react-native-web. No navegador, o diálogo vira `alert` (só aviso) ou
 * `confirm` (ação e cancelar). Com várias ações, o OK escolhe a primeira, e o texto diz qual é.
 */
export function runWebDialog(title: string, message: string | undefined, buttons: DialogButton[] | undefined, options: DialogOptions | undefined, browser: Browser) {
  const text = message ? `${title}\n\n${message}` : title;
  const list = buttons ?? [];
  const actions = list.filter((b) => b.style !== "cancel");
  const cancel = list.find((b) => b.style === "cancel");

  if (list.length <= 1) {
    browser.alert(text);
    list[0]?.onPress?.();
    return;
  }
  const [first] = actions;
  if (!first) {
    browser.alert(text);
    cancel?.onPress?.();
    return;
  }
  const question = actions.length > 1 ? `${text}\n\nOK abre: ${first.text}` : text;
  if (browser.confirm(question)) {
    first.onPress?.();
  } else {
    cancel?.onPress?.();
    options?.onDismiss?.();
  }
}
