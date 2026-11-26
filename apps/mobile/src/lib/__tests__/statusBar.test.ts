import { statusBarStyleFor } from "../statusBar";

describe("statusBarStyleFor", () => {
  it.each(["/occurrences/abc", "/pets/abc"])("%s tem foto no topo → ícones claros", (path) => expect(statusBarStyleFor(path)).toBe("light"));

  it.each([
    "/splash", "/login", "/forgot-password", "/verify-email", "/consent", "/welcome", "/", "/profile",
    "/map", "/alerts", "/chat", "/chat/abc", "/privacy", "/help", "/alert-preferences", "/pets/new", "/pets/abc/edit", "/occurrences/new", "/occurrences/abc/edit",
  ])("%s tem topo branco → ícones escuros", (path) => expect(statusBarStyleFor(path)).toBe("dark"));
});
