import { CreateBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";

export const TEST_BUCKET = "pet-photos";

const ACCESS_KEY = "miaucha-teste";
const SECRET_KEY = "miaucha-teste-segredo";

/**
 * Sobe um PostGIS e um RustFS (S3 compatível, valida assinatura, bucket privado) para os testes de integração.
 * O MinIO parou de publicar imagens no Docker Hub; o RustFS faz o mesmo papel.
 */
export default async function globalSetup() {
  const [pg, s3Container] = await Promise.all([
    new PostgreSqlContainer("postgis/postgis:17-3.5-alpine").start(),
    new GenericContainer("rustfs/rustfs:1.0.6")
      .withEnvironment({ RUSTFS_ACCESS_KEY: ACCESS_KEY, RUSTFS_SECRET_KEY: SECRET_KEY })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forListeningPorts())
      .start(),
  ]);
  const endpoint = `http://${s3Container.getHost()}:${s3Container.getMappedPort(9000)}`;
  process.env.DATABASE_URL = pg.getConnectionUri();
  process.env.STORAGE_ENDPOINT = endpoint;
  process.env.STORAGE_ACCESS_KEY_ID = ACCESS_KEY;
  process.env.STORAGE_SECRET_ACCESS_KEY = SECRET_KEY;

  const s3 = new S3Client({
    endpoint,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  });
  await s3.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));

  (globalThis as { __CONTAINERS__?: unknown[] }).__CONTAINERS__ = [pg, s3Container];
}
