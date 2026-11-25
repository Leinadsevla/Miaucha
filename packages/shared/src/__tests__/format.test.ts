import { formatApproxDistance, formatTimeAgo, formatDistance } from "../format";

const now = new Date("2026-11-17T15:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const H = 60 * MIN;
const D = 24 * H;

describe("formatTimeAgo (MP-04)", () => {
  it.each([
    [30_000, "agora"],
    [5 * MIN, "5 min atrás"],
    [59 * MIN, "59 min atrás"],
    [2 * H, "2h atrás"],
    [23 * H, "23h atrás"],
    [1 * D, "1 dia atrás"],
    [3 * D, "3 dias atrás"],
  ])("%i ms → %s", (ms, esperado) => {
    expect(formatTimeAgo(ago(ms), now)).toBe(esperado);
  });

  it("data no futuro vira 'agora'", () => {
    expect(formatTimeAgo(new Date(now.getTime() + H), now)).toBe("agora");
  });
});

describe("formatDistance", () => {
  it.each([
    [80, "80 m"],
    [999, "999 m"],
    [1000, "1 km"],
    [300, "300 m"],
    [1250, "1,3 km"],
    [12_400, "12 km"],
  ])("%i m → %s", (m, esperado) => {
    expect(formatDistance(m)).toBe(esperado);
  });
});

describe("formatApproxDistance (alertas: a posição do usuário é uma célula de ~1 km)", () => {
  it.each([
    [20, "100 m"],
    [149, "100 m"],
    [820, "800 m"],
    [960, "1 km"],
    [2_340, "2,3 km"],
  ])("%i m → %s", (m, esperado) => {
    expect(formatApproxDistance(m)).toBe(esperado);
  });
});
