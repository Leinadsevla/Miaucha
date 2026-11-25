import { OCCURRENCE_SEARCH_LIMIT, type PublicOccurrence } from "@miaucha/shared";
import { createFileTextStore, createMapCache, type TextStore } from "../mapCache";
import type { Region } from "../region";

const mockFiles = new Map<string, string>();
jest.mock("expo-file-system", () => ({
  Paths: { document: "file:///docs" },
  File: class {
    uri: string;
    constructor(dir: string, name: string) {
      this.uri = `${dir}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    async text() {
      const value = mockFiles.get(this.uri);
      if (value === undefined) throw new Error("não existe");
      return value;
    }
    async write(content: string) {
      mockFiles.set(this.uri, content);
    }
    delete() {
      mockFiles.delete(this.uri);
    }
  },
}));

const region: Region = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.02, longitudeDelta: 0.02 };
const thor: PublicOccurrence = {
  id: "o1",
  type: "lost",
  species: "dog",
  petName: "Thor",
  breed: null,
  color: null,
  description: null,
  photoUrls: [],
  publicLocation: { lat: -23.55, lng: -46.63 },
  approxAddress: null,
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: false,
  createdAt: "2026-11-20T12:00:00Z",
};

function memoryStore(initial: string | null = null): TextStore & { value: string | null } {
  const store = {
    value: initial,
    read: async () => store.value,
    write: async (text: string) => void (store.value = text),
    clear: async () => void (store.value = null),
  };
  return store;
}

describe("cache do último mapa (MP-08)", () => {
  it("salva e lê a região e as ocorrências", async () => {
    const cache = createMapCache(memoryStore());
    await cache.save({ region, occurrences: [thor], savedAt: "2026-11-20T13:00:00Z" });
    expect(await cache.load()).toEqual({ region, occurrences: [thor], savedAt: "2026-11-20T13:00:00Z" });
  });

  it("sem nada salvo, devolve null", async () => {
    expect(await createMapCache(memoryStore()).load()).toBeNull();
  });

  it("conteúdo corrompido ou de outro formato vira null em vez de quebrar a tela", async () => {
    expect(await createMapCache(memoryStore("{não é json")).load()).toBeNull();
    expect(await createMapCache(memoryStore(JSON.stringify({ version: 1, region: "x" }))).load()).toBeNull();
    expect(await createMapCache(memoryStore(JSON.stringify({ version: 99, region, occurrences: [], savedAt: "" }))).load()).toBeNull();
  });

  it("falha do armazenamento nunca lança", async () => {
    const broken: TextStore = {
      read: async () => {
        throw new Error("disco");
      },
      write: async () => {
        throw new Error("disco");
      },
      clear: async () => {
        throw new Error("disco");
      },
    };
    const cache = createMapCache(broken);
    await expect(cache.save({ region, occurrences: [thor], savedAt: "x" })).resolves.toBeUndefined();
    await expect(cache.load()).resolves.toBeNull();
    await expect(cache.clear()).resolves.toBeUndefined();
  });

  it("guarda no máximo o limite de uma busca", async () => {
    const store = memoryStore();
    const many = Array.from({ length: OCCURRENCE_SEARCH_LIMIT + 50 }, (_, i) => ({ ...thor, id: `o${i}` }));
    await createMapCache(store).save({ region, occurrences: many, savedAt: "x" });
    expect((await createMapCache(store).load())?.occurrences).toHaveLength(OCCURRENCE_SEARCH_LIMIT);
  });

  it("clear apaga o mapa salvo (ex.: ao sair da conta)", async () => {
    const cache = createMapCache(memoryStore());
    await cache.save({ region, occurrences: [thor], savedAt: "x" });
    await cache.clear();
    expect(await cache.load()).toBeNull();
  });
});

describe("createFileTextStore (expo-file-system)", () => {
  beforeEach(() => mockFiles.clear());

  it("lê null quando o arquivo não existe, grava e apaga", async () => {
    const store = createFileTextStore("mapa.json");
    expect(await store.read()).toBeNull();
    await store.write("conteúdo");
    expect(mockFiles.get("file:///docs/mapa.json")).toBe("conteúdo");
    expect(await store.read()).toBe("conteúdo");
    await store.clear();
    expect(await store.read()).toBeNull();
  });
});
