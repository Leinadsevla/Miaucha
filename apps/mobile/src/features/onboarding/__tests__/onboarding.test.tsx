import { fireEvent, render, screen } from "@testing-library/react-native";
import { OnboardingScreen, ONBOARDING_SLIDES } from "../OnboardingScreen";
import { ONBOARDING_KEY, createOnboardingStore, shouldShowOnboarding } from "../onboarding";

function memoryStore() {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (k: string) => data.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => void data.set(k, v),
  };
}

describe("createOnboardingStore", () => {
  it("começa sem ter visto; depois de marcar, lembra", async () => {
    const store = memoryStore();
    const onboarding = createOnboardingStore(store);
    expect(await onboarding.hasSeen()).toBe(false);
    await onboarding.markSeen();
    expect(await onboarding.hasSeen()).toBe(true);
    expect(ONBOARDING_KEY).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it("erro do armazenamento conta como já visto (não prende a pessoa no tutorial)", async () => {
    const onboarding = createOnboardingStore({
      getItemAsync: async () => Promise.reject(new Error("keychain")),
      setItemAsync: async () => Promise.reject(new Error("keychain")),
    });
    expect(await onboarding.hasSeen()).toBe(true);
    await expect(onboarding.markSeen()).resolves.toBeUndefined();
  });
});

describe("shouldShowOnboarding", () => {
  it("só ao chegar no app (logado, com consentimento) sem ter visto o tutorial", () => {
    expect(shouldShowOnboarding("/", "/", false)).toBe(true);
    expect(shouldShowOnboarding("/map", "/", false)).toBe(true);
    expect(shouldShowOnboarding("/", "/", true)).toBe(false);
    expect(shouldShowOnboarding("/", "/", null)).toBe(false); // ainda carregando
    expect(shouldShowOnboarding("/welcome", "/", false)).toBe(false);
    expect(shouldShowOnboarding("/login", "/login", false)).toBe(false);
    expect(shouldShowOnboarding("/consent", "/consent", false)).toBe(false);
  });
});

describe("OnboardingScreen", () => {
  it("o passo de boas-vindas mostra a logo do Miaucha", async () => {
    await render(<OnboardingScreen onDone={jest.fn()} />);
    expect(screen.getByLabelText("Logo do Miaucha")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.queryByLabelText("Logo do Miaucha")).toBeNull();
  });

  it("quatro passos: avança com Próximo e termina com Começar", async () => {
    const onDone = jest.fn();
    await render(<OnboardingScreen onDone={onDone} />);
    expect(ONBOARDING_SLIDES).toHaveLength(4);
    expect(screen.getByRole("header", { name: "Bem-vindo ao Miaucha" })).toBeOnTheScreen();
    expect(screen.getByText("Passo 1 de 4")).toBeOnTheScreen();

    for (let i = 0; i < 3; i++) await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Passo 4 de 4")).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Converse com segurança" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Começar" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("Pular termina na hora; Voltar retorna ao passo anterior", async () => {
    const onDone = jest.fn();
    await render(<OnboardingScreen onDone={onDone} />);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Passo 1 de 4")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Pular" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("os textos falam de ocorrência, mapa, alertas e privacidade", () => {
    const text = ONBOARDING_SLIDES.map((s) => `${s.title} ${s.body}`).join(" ");
    expect(text).toMatch(/Registrar ocorrência/);
    expect(text).toMatch(/mapa/);
    expect(text).toMatch(/alerta/);
    expect(text).toMatch(/nome público/);
  });
});
