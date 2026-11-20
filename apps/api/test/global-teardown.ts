type Stoppable = { stop(): Promise<unknown> };

export default async function globalTeardown() {
  const containers = (globalThis as { __CONTAINERS__?: Stoppable[] }).__CONTAINERS__ ?? [];
  await Promise.all(containers.map((c) => c.stop()));
}
