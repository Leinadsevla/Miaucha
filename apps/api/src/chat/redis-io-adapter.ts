import type { INestApplication } from "@nestjs/common";
import { IoAdapter } from "@nestjs/platform-socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { Server, ServerOptions } from "socket.io";

/**
 * Adapter do Socket.IO com Redis pub/sub (CH-03 com várias instâncias da API): um evento emitido numa
 * instância chega aos sockets conectados nas outras, e o `fetchSockets` (usado para decidir o push)
 * enxerga todas. Com uma instância só, não é necessário: só é ligado quando existe `REDIS_URL`.
 */
export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;
  private clients: { quit(): Promise<unknown> }[] = [];

  async connect(url: string): Promise<void> {
    const pub = createClient({ url });
    const sub = pub.duplicate();
    pub.on("error", () => undefined);
    sub.on("error", () => undefined);
    await Promise.all([pub.connect(), sub.connect()]);
    this.clients = [pub, sub];
    this.adapterConstructor = createAdapter(pub, sub);
  }

  override createIOServer(port: number | undefined, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }

  override async close(server: Server): Promise<void> {
    await super.close(server);
    await Promise.all(this.clients.map((client) => client.quit().catch(() => undefined)));
    this.clients = [];
  }
}

/** Liga o adapter do Redis antes do `listen`/`init`. */
export async function useRedisAdapter(app: INestApplication, url: string): Promise<void> {
  const adapter = new RedisIoAdapter(app);
  await adapter.connect(url);
  app.useWebSocketAdapter(adapter);
}
