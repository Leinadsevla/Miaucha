import type { MyPet } from "@miaucha/shared";
import { createApiSession, type FetchLike } from "@/features/auth/apiSession";
import type { SessionStorage, StoredSession } from "@/features/auth/sessionStorage";
import { createHttpPetsClient, savePet, type PetsClient, type Uploader } from "../petsClient";

type Call = { method: string; path: string; body: unknown; authorization?: string };

function setup(routes: Record<string, (call: Call) => { status: number; body?: unknown }>) {
  const calls: Call[] = [];
  const fetch: FetchLike = async (url, init) => {
    const call = {
      method: init.method,
      path: url.replace("https://api.teste", ""),
      body: init.body ? JSON.parse(init.body) : undefined,
      authorization: init.headers.Authorization,
    };
    calls.push(call);
    const handler = routes[`${call.method} ${call.path}`];
    if (!handler) throw new Error(`rota não esperada: ${call.method} ${call.path}`);
    const reply = handler(call);
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body };
  };
  let current: StoredSession | null = { accessToken: "access", refreshToken: "refresh", user: { id: "u1", name: "Ana", hasConsent: true } };
  const storage: SessionStorage = { load: async () => current, save: async (s) => void (current = s), clear: async () => void (current = null) };
  const uploads: { url: string; uri: string; contentType: string }[] = [];
  const upload: Uploader = async (url, photo, contentType) => void uploads.push({ url, uri: photo.uri, contentType });
  const client = createHttpPetsClient({ session: createApiSession({ baseUrl: "https://api.teste", storage, fetch }), upload });
  return { client, calls, uploads };
}

const thor: MyPet = { id: "p1", name: "Thor", species: "dog", breed: null, color: null, approxAge: null, photos: [] };
const input = { name: "Thor", species: "dog" as const, breed: "", color: "", approxAge: "" };

describe("createHttpPetsClient", () => {
  it("listMine faz GET autenticado em /me/pets", async () => {
    const { client, calls } = setup({ "GET /me/pets": () => ({ status: 200, body: [thor] }) });
    expect(await client.listMine()).toEqual([thor]);
    expect(calls[0]).toMatchObject({ authorization: "Bearer access", body: undefined });
  });

  it("get faz GET autenticado em /pets/:id", async () => {
    const { client, calls } = setup({ "GET /pets/p1": () => ({ status: 200, body: thor }) });
    expect(await client.get("p1")).toEqual(thor);
    expect(calls[0].authorization).toBe("Bearer access");
  });

  it("create envia os dados do formulário", async () => {
    const { client, calls } = setup({ "POST /pets": () => ({ status: 201, body: thor }) });
    expect(await client.create(input)).toEqual(thor);
    expect(calls[0].body).toEqual(input);
  });

  it("addPhoto: pede a URL, envia o arquivo direto ao storage e confirma", async () => {
    const { client, calls, uploads } = setup({
      "POST /pets/p1/photos": () => ({ status: 201, body: { photoId: "f1", uploadUrl: "https://storage/assinada", expiresInSeconds: 300 } }),
      "POST /pets/p1/photos/f1/confirm": () => ({ status: 200, body: { id: "f1", url: "https://storage/leitura" } }),
    });

    const photo = await client.addPhoto("p1", { uri: "file:///foto.png", mimeType: "image/png" });

    expect(photo).toEqual({ id: "f1", url: "https://storage/leitura" });
    expect(calls[0].body).toEqual({ contentType: "image/png" });
    expect(uploads).toEqual([{ url: "https://storage/assinada", uri: "file:///foto.png", contentType: "image/png" }]);
    expect(calls.map((c) => c.path)).toEqual(["/pets/p1/photos", "/pets/p1/photos/f1/confirm"]);
  });

  it("addPhoto recusa foto inválida antes de chamar a API", async () => {
    const { client, calls } = setup({});
    await expect(client.addPhoto("p1", { uri: "file:///a.heic" })).rejects.toThrow("Envie uma foto JPG, PNG ou WebP");
    expect(calls).toHaveLength(0);
  });

  it("erro da API no confirm chega com a mensagem dela", async () => {
    const { client } = setup({
      "POST /pets/p1/photos": () => ({ status: 201, body: { photoId: "f1", uploadUrl: "u", expiresInSeconds: 300 } }),
      "POST /pets/p1/photos/f1/confirm": () => ({ status: 400, body: { message: "A foto passa de 10 MB" } }),
    });
    await expect(client.addPhoto("p1", { uri: "file:///a.jpg" })).rejects.toThrow("A foto passa de 10 MB");
  });
});

describe("savePet", () => {
  function fakeClient(failOn: string[] = []): PetsClient & { added: string[] } {
    const added: string[] = [];
    return {
      added,
      listMine: async () => [],
      get: async () => thor,
      create: async () => thor,
      addPhoto: async (_petId, photo) => {
        if (failOn.includes(photo.uri)) throw new Error("falhou");
        added.push(photo.uri);
        return { id: photo.uri, url: photo.uri };
      },
    };
  }

  it("cria o pet e envia as fotos em ordem", async () => {
    const client = fakeClient();
    const result = await savePet(client, input, [{ uri: "a.jpg" }, { uri: "b.jpg" }]);
    expect(result).toEqual({ pet: { ...thor, photos: [{ id: "a.jpg", url: "a.jpg" }, { id: "b.jpg", url: "b.jpg" }] }, failedPhotos: 0 });
    expect(client.added).toEqual(["a.jpg", "b.jpg"]);
  });

  it("se uma foto falhar, o pet continua salvo e o resultado conta a falha", async () => {
    const result = await savePet(fakeClient(["b.jpg"]), input, [{ uri: "a.jpg" }, { uri: "b.jpg" }]);
    expect(result.failedPhotos).toBe(1);
    expect(result.pet.photos).toHaveLength(1);
  });
});
