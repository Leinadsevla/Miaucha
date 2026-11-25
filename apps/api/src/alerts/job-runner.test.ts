import { InProcessJobRunner } from "./job-runner";

const tick = () => new Promise((resolve) => setImmediate(resolve));

describe("InProcessJobRunner (fila em processo, no lugar do BullMQ)", () => {
  it("não roda o job na hora: quem enfileira não espera", async () => {
    const work = jest.fn(async () => {});
    const runner = new InProcessJobRunner(work);
    runner.enqueue("o1");
    expect(work).not.toHaveBeenCalled();
    await runner.onIdle();
    expect(work).toHaveBeenCalledWith("o1");
  });

  it("onIdle espera todos os jobs, inclusive os enfileirados durante a espera", async () => {
    const done: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const runner = new InProcessJobRunner(async (id: string) => {
      if (id === "lento") await gate;
      done.push(id);
    });
    runner.enqueue("lento");
    runner.enqueue("rápido");
    const idle = runner.onIdle();
    await tick();
    expect(done).toEqual(["rápido"]);
    release();
    await idle;
    expect(done).toEqual(["rápido", "lento"]);
  });

  it("erro num job vai para o log e não derruba os outros", async () => {
    const log = jest.fn();
    const done: string[] = [];
    const runner = new InProcessJobRunner(async (id: string) => {
      if (id === "ruim") throw new Error("falhou");
      done.push(id);
    }, log);
    runner.enqueue("ruim");
    runner.enqueue("bom");
    await runner.onIdle();
    expect(done).toEqual(["bom"]);
    expect(log).toHaveBeenCalledWith(expect.stringContaining("ruim"), expect.any(Error));
  });

  it("onIdle sem nada pendente resolve na hora", async () => {
    await expect(new InProcessJobRunner(async () => {}).onIdle()).resolves.toBeUndefined();
  });
});
