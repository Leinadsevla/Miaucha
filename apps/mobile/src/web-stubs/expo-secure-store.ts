// Substituto do expo-secure-store na web (ligado em metro.config.js só para `platform === "web"`).
// O navegador não tem Keychain/Keystore: aqui os valores ficam no localStorage, para a sessão
// continuar depois de recarregar a página. No app nativo nada muda.
const storage = (): Storage | null => (typeof localStorage === "undefined" ? null : localStorage);

export async function getItemAsync(key: string): Promise<string | null> {
  return storage()?.getItem(key) ?? null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  storage()?.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  storage()?.removeItem(key);
}
