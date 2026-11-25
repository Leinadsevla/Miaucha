import { createSecureSessionStorage, SESSION_KEY, type KeyValueStore, type StoredSession } from "../sessionStorage";

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (key) => data.get(key) ?? null,
    setItemAsync: async (key, value) => void data.set(key, value),
    deleteItemAsync: async (key) => void data.delete(key),
  };
}

const session: StoredSession = {
  accessToken: "access",
  refreshToken: "refresh",
  user: { id: "u1", name: "Ana", hasConsent: false },
};

describe("createSecureSessionStorage", () => {
  it("a chave só usa caracteres aceitos pelo SecureStore", () => {
    expect(SESSION_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("salva, carrega e apaga a sessão", async () => {
    const store = memoryStore();
    const storage = createSecureSessionStorage(store);

    expect(await storage.load()).toBeNull();
    await storage.save(session);
    expect(await storage.load()).toEqual(session);
    await storage.clear();
    expect(await storage.load()).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("conteúdo corrompido ou incompleto conta como sem sessão", async () => {
    const store = memoryStore();
    const storage = createSecureSessionStorage(store);

    store.data.set(SESSION_KEY, "{não é json");
    expect(await storage.load()).toBeNull();

    store.data.set(SESSION_KEY, JSON.stringify({ accessToken: "a" }));
    expect(await storage.load()).toBeNull();
  });

  it("erro do armazenamento nativo na leitura conta como sem sessão", async () => {
    const storage = createSecureSessionStorage({
      ...memoryStore(),
      getItemAsync: async () => {
        throw new Error("keychain indisponível");
      },
    });
    expect(await storage.load()).toBeNull();
  });
});
