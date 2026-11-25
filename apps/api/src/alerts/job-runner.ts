/**
 * Fila mínima em processo: `enqueue` volta na hora e o job roda depois (setImmediate), sem bloquear
 * a requisição. Não sobrevive a um reinício da API nem divide trabalho entre instâncias: para isso,
 * trocar por BullMQ + Redis atrás da mesma interface `AlertQueue` (ver docs/PROXIMOS-PASSOS.md).
 */
export class InProcessJobRunner<T> {
  private readonly pending = new Set<Promise<void>>();

  constructor(
    private readonly work: (payload: T) => Promise<void>,
    private readonly log: (message: string, error: unknown) => void = (message, error) => console.error(message, error),
  ) {}

  enqueue(payload: T): void {
    const job = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => this.work(payload))
      .catch((error: unknown) => this.log(`Job falhou (${String(payload)})`, error))
      .finally(() => this.pending.delete(job));
    this.pending.add(job);
  }

  /** Espera esvaziar (testes e desligamento da API). */
  async onIdle(): Promise<void> {
    while (this.pending.size > 0) await Promise.all([...this.pending]);
  }
}
