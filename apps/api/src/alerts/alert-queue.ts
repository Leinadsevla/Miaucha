import { type BeforeApplicationShutdown, Injectable } from "@nestjs/common";
import { AlertsService } from "./alerts.service";
import { InProcessJobRunner } from "./job-runner";

/**
 * Fila do disparo de alertas (AL-01). Quem cria a ocorrência só enfileira e responde.
 * Hoje roda em processo; trocar por BullMQ + Redis = outra classe com esta mesma interface,
 * registrada no token ALERT_QUEUE (ver docs/PROXIMOS-PASSOS.md, S5).
 */
export interface AlertQueue {
  occurrenceCreated(occurrenceId: string): void;
  /** Espera os disparos pendentes (testes e desligamento). */
  onIdle(): Promise<void>;
}

@Injectable()
export class InProcessAlertQueue implements AlertQueue, BeforeApplicationShutdown {
  private readonly runner: InProcessJobRunner<string>;

  constructor(alerts: AlertsService) {
    this.runner = new InProcessJobRunner((id) => alerts.dispatchForOccurrence(id), (message, error) =>
      console.error(`[alertas] ${message}`, error),
    );
  }

  occurrenceCreated(occurrenceId: string): void {
    this.runner.enqueue(occurrenceId);
  }

  onIdle(): Promise<void> {
    return this.runner.onIdle();
  }

  /** Termina os disparos antes de o pool do banco fechar. */
  beforeApplicationShutdown(): Promise<void> {
    return this.onIdle();
  }
}
