import { statusBarStyleFor } from "../statusBar";

describe("statusBarStyleFor", () => {
  it.each(["/splash", "/login", "/forgot-password", "/verify-email", "/consent", "/welcome", "/", "/profile", "/occurrences/abc", "/pets/abc"])(
    "%s tem fundo laranja ou foto no topo → ícones claros",
    (path) => expect(statusBarStyleFor(path)).toBe("light"),
  );

  it.each(["/map", "/alerts", "/chat", "/chat/abc", "/privacy", "/help", "/alert-preferences", "/pets/new", "/pets/abc/edit", "/occurrences/new", "/occurrences/abc/edit"])(
    "%s tem topo branco → ícones escuros",
    (path) => expect(statusBarStyleFor(path)).toBe("dark"),
  );
});
