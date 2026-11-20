import { S3PhotoStorage } from "../src/storage/s3-photo-storage";
import { closeTestApp, createTestApp, expectNoPrivateData, signUpVerified, storageConfigFromEnv, type TestContext } from "./helpers";

let ctx: TestContext;
const storage = new S3PhotoStorage(storageConfigFromEnv());

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(() => closeTestApp(ctx));

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 9, 8, 7, 6, 5]);
const thor = { name: "Thor", species: "dog", breed: "Golden Retriever" };

async function tutor() {
  const { body } = await signUpVerified(ctx);
  const auth = { Authorization: `Bearer ${body.accessToken}` };
  return {
    auth,
    createPet: async (pet: object = thor) => (await ctx.http.post("/pets").set(auth).send(pet).expect(201)).body,
    requestUpload: (petId: string, contentType = "image/jpeg") =>
      ctx.http.post(`/pets/${petId}/photos`).set(auth).send({ contentType }),
    confirm: (petId: string, photoId: string) => ctx.http.post(`/pets/${petId}/photos/${photoId}/confirm`).set(auth).send(),
    myPets: async () => (await ctx.http.get("/me/pets").set(auth).expect(200)).body,
  };
}

async function put(uploadUrl: string, body: Buffer, contentType = "image/jpeg") {
  const res = await fetch(uploadUrl, { method: "PUT", body: new Uint8Array(body), headers: { "Content-Type": contentType } });
  expect(res.status).toBe(200);
}

/** Pede a URL, envia a foto direto ao storage e confirma. */
async function addPhoto(t: Awaited<ReturnType<typeof tutor>>, petId: string, body = jpeg) {
  const req = await t.requestUpload(petId).expect(201);
  await put(req.body.uploadUrl, body);
  return t.confirm(petId, req.body.photoId).expect(200);
}

describe("POST /pets", () => {
  it("cria o pet do usuário logado", async () => {
    const t = await tutor();
    const res = await ctx.http.post("/pets").set(t.auth).send({ ...thor, color: " Dourado " }).expect(201);
    expect(res.body).toEqual({
      id: expect.any(String),
      name: "Thor",
      species: "dog",
      breed: "Golden Retriever",
      color: "Dourado",
      approxAge: null,
      photos: [],
    });
    expectNoPrivateData(res.body);
  });

  it("dados inválidos → 400 com as mensagens de validatePet", async () => {
    const t = await tutor();
    const res = await ctx.http.post("/pets").set(t.auth).send({ name: "", species: "peixe" }).expect(400);
    expect(res.body.errors).toEqual({ name: "Informe o nome do pet", species: "Escolha cão ou gato" });
  });

  it("sem login → 401", async () => {
    await ctx.http.post("/pets").send(thor).expect(401);
  });
});

describe("GET /me/pets", () => {
  it("lista só os pets do usuário, do mais novo para o mais antigo", async () => {
    const ana = await tutor();
    const bia = await tutor();
    await ana.createPet({ name: "Thor", species: "dog" });
    await ana.createPet({ name: "Mia", species: "cat" });
    await bia.createPet({ name: "Rex", species: "dog" });

    expect((await ana.myPets()).map((p: { name: string }) => p.name)).toEqual(["Mia", "Thor"]);
    expect(await (await tutor()).myPets()).toEqual([]);
  });

  it("sem login → 401", async () => {
    await ctx.http.get("/me/pets").expect(401);
  });
});

describe("fotos do pet (upload por URL assinada)", () => {
  it("fluxo completo: pede URL, envia direto ao storage, confirma e a foto aparece com URL assinada", async () => {
    const t = await tutor();
    const pet = await t.createPet();

    const req = await t.requestUpload(pet.id).expect(201);
    expect(req.body).toEqual({ photoId: expect.any(String), uploadUrl: expect.any(String), expiresInSeconds: 300 });
    await put(req.body.uploadUrl, jpeg);
    const confirmed = await t.confirm(pet.id, req.body.photoId).expect(200);
    expect(confirmed.body).toEqual({ id: req.body.photoId, url: expect.any(String) });

    const [listed] = await t.myPets();
    expect(listed.photos).toEqual([{ id: req.body.photoId, url: expect.any(String) }]);
    const download = await fetch(listed.photos[0].url);
    expect(Buffer.from(await download.arrayBuffer())).toEqual(jpeg);
  });

  it("NF-05: toda URL de foto devolvida é assinada e expira", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    await addPhoto(t, pet.id);

    const [listed] = await t.myPets();
    const url = new URL(listed.photos[0].url);
    expect(url.searchParams.get("X-Amz-Signature")).toBeTruthy();
    expect(Number(url.searchParams.get("X-Amz-Expires"))).toBeLessThanOrEqual(3600);

    const unsigned = await fetch(`${url.origin}${url.pathname}`);
    expect(unsigned.status).toBe(403);
  });

  it("foto pedida mas não enviada não aparece na lista, e confirmar antes do envio → 400", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    const req = await t.requestUpload(pet.id).expect(201);

    expect((await t.myPets())[0].photos).toEqual([]);
    const res = await t.confirm(pet.id, req.body.photoId).expect(400);
    expect(res.body.message).toBe("A foto ainda não foi enviada");
  });

  it("tipo de arquivo não aceito → 400", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    const res = await t.requestUpload(pet.id, "image/gif").expect(400);
    expect(res.body.message).toBe("Envie uma foto JPG, PNG ou WebP");
  });

  it("foto maior que 10 MB → 400 na confirmação e o arquivo é apagado do storage", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    const req = await t.requestUpload(pet.id).expect(201);
    await put(req.body.uploadUrl, Buffer.alloc(10 * 1024 * 1024 + 1));

    const res = await t.confirm(pet.id, req.body.photoId).expect(400);
    expect(res.body.message).toBe("A foto passa de 10 MB");
    const key = new URL(req.body.uploadUrl).pathname.split("/").slice(2).join("/");
    expect(await storage.stat(key)).toBeNull();
    await t.confirm(pet.id, req.body.photoId).expect(404);
  });

  it("no máximo 5 fotos por pet", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    for (let i = 0; i < 5; i++) await addPhoto(t, pet.id);

    const res = await t.requestUpload(pet.id).expect(400);
    expect(res.body.message).toBe("Cada pet pode ter até 5 fotos");
  });

  it("pet de outra pessoa ou id inválido → 404 (não revela que existe)", async () => {
    const ana = await tutor();
    const bia = await tutor();
    const pet = await ana.createPet();
    const req = await ana.requestUpload(pet.id).expect(201);

    await bia.requestUpload(pet.id).expect(404);
    await bia.confirm(pet.id, req.body.photoId).expect(404);
    await ana.requestUpload("nao-e-uuid").expect(404);
    await ana.confirm(pet.id, "nao-e-uuid").expect(404);
  });
});

describe("conteúdo da foto", () => {
  it("arquivo que não é imagem (mesmo declarado como JPEG) → 400 e é apagado do storage", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    const req = await t.requestUpload(pet.id).expect(201);
    await put(req.body.uploadUrl, Buffer.from("File not found"));

    const res = await t.confirm(pet.id, req.body.photoId).expect(400);
    expect(res.body.message).toBe("O arquivo enviado não é uma imagem válida");
    const key = new URL(req.body.uploadUrl).pathname.split("/").slice(2).join("/");
    expect(await storage.stat(key)).toBeNull();
    expect((await t.myPets())[0].photos).toEqual([]);
  });

  it("PNG declarado como JPEG → 400", async () => {
    const t = await tutor();
    const pet = await t.createPet();
    const req = await t.requestUpload(pet.id, "image/jpeg").expect(201);
    await put(req.body.uploadUrl, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]));
    await t.confirm(pet.id, req.body.photoId).expect(400);
  });
});
