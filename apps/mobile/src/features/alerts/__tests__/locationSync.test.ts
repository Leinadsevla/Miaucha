import { encodeGeohash } from "@miaucha/shared";
import type { LocationResult } from "@/features/location/currentLocation";
import { createLocationSync } from "../locationSync";

function setup(results: LocationResult[], send = jest.fn(async (_geohash: string) => {})) {
  const queue = [...results];
  const getLocation = jest.fn(async () => (queue.length > 1 ? queue.shift()! : queue[0]));
  return { sync: createLocationSync({ getLocation, send }), send, getLocation };
}

const ok = (lat: number, lng: number): LocationResult => ({ status: "ok", coords: { lat, lng } });

describe("createLocationSync (AL-06)", () => {
  it("envia só o geohash de 6 caracteres da posição", async () => {
    const { sync, send } = setup([ok(-23.5505, -46.6333)]);
    expect(await sync()).toBe("sent");
    expect(send).toHaveBeenCalledWith("6gyf4b");
    expect(send.mock.calls[0]).toHaveLength(1);
  });

  it("não reenvia enquanto continua na mesma célula; envia ao mudar de célula", async () => {
    const { sync, send } = setup([ok(-23.5505, -46.6333), ok(-23.5506, -46.6334), ok(-23.57, -46.6333)]);
    expect(await sync()).toBe("sent");
    expect(await sync()).toBe("unchanged");
    expect(await sync()).toBe("sent");
    expect(send.mock.calls.map((c) => c[0])).toEqual(["6gyf4b", encodeGeohash(-23.57, -46.6333)]);
  });

  it("sem permissão ou sem GPS não envia nada", async () => {
    const denied = setup([{ status: "denied", canAskAgain: true }]);
    expect(await denied.sync()).toBe("no-location");
    const unavailable = setup([{ status: "unavailable" }]);
    expect(await unavailable.sync()).toBe("no-location");
    expect(denied.send).not.toHaveBeenCalled();
    expect(unavailable.send).not.toHaveBeenCalled();
  });

  it("se o envio falha, tenta de novo na próxima vez (mesma célula)", async () => {
    let fail = true;
    const send = jest.fn(async (_geohash: string) => {
      if (fail) throw new Error("sem rede");
    });
    const { sync } = setup([ok(-23.5505, -46.6333)], send);
    expect(await sync()).toBe("failed");
    fail = false;
    expect(await sync()).toBe("sent");
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("chamadas simultâneas viram uma só", async () => {
    const { sync, send, getLocation } = setup([ok(-23.5505, -46.6333)]);
    const [a, b] = await Promise.all([sync(), sync()]);
    expect([a, b]).toEqual(["sent", "sent"]);
    expect(getLocation).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });
});
