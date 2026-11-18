import { render, screen, fireEvent } from "@testing-library/react-native";
import { colors } from "@miaucha/shared";
import { StatusBadge } from "../StatusBadge";
import { PrimaryButton } from "../PrimaryButton";
import { TextField } from "../TextField";
import { PetCard } from "../PetCard";
import { BottomNav } from "../BottomNav";

describe("StatusBadge (MP-01)", () => {
  it.each([
    ["lost", "Perdido", colors.lost],
    ["seen", "Avistado", colors.seen],
    ["found", "Encontrado", colors.found],
  ] as const)("%s mostra '%s' com a cor do tipo", async (type, label, color) => {
    await render(<StatusBadge type={type} />);
    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.getByTestId("status-dot")).toHaveStyle({ backgroundColor: color });
  });
});

describe("PrimaryButton", () => {
  it("chama onPress", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("não chama onPress quando desabilitado", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole("button", { name: "Entrar" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("mostra carregando e bloqueia o toque", async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Entrar" onPress={onPress} loading />);
    expect(screen.getByTestId("button-loading")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("TextField", () => {
  it("liga o rótulo ao campo e repassa o texto", async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="E-mail" value="" onChangeText={onChangeText} />);
    await fireEvent.changeText(screen.getByLabelText("E-mail"), "ana@exemplo.com");
    expect(onChangeText).toHaveBeenCalledWith("ana@exemplo.com");
  });

  it("mostra a mensagem de erro", async () => {
    await render(<TextField label="E-mail" value="" onChangeText={() => {}} error="E-mail inválido" />);
    expect(screen.getByText("E-mail inválido")).toBeOnTheScreen();
  });
});

describe("PetCard (MP-04)", () => {
  const now = new Date("2026-11-17T15:00:00Z");
  const occurrence = {
    id: "1",
    type: "lost" as const,
    species: "dog" as const,
    petName: "Thor",
    breed: "Golden Retriever",
    color: "Dourado",
    description: null,
    photoUrls: ["https://exemplo.com/thor.jpg"],
    publicLocation: { lat: -23.56, lng: -46.65 },
    approxAddress: "Bela Vista",
    authorPseudonym: "Tutor Laranja 42",
    createdAt: "2026-11-17T13:00:00Z",
  };

  it("mostra nome, raça, distância, região e tempo", async () => {
    await render(<PetCard occurrence={occurrence} distanceMeters={300} now={now} onPress={() => {}} />);
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever")).toBeOnTheScreen();
    expect(screen.getByText("300 m")).toBeOnTheScreen();
    expect(screen.getByText("Bela Vista")).toBeOnTheScreen();
    expect(screen.getByText("2h atrás")).toBeOnTheScreen();
    expect(screen.getByText("Perdido")).toBeOnTheScreen();
  });

  it("pet sem nome aparece como 'Sem nome'", async () => {
    await render(<PetCard occurrence={{ ...occurrence, petName: null }} now={now} onPress={() => {}} />);
    expect(screen.getByText("Sem nome")).toBeOnTheScreen();
  });

  it("toque chama onPress", async () => {
    const onPress = jest.fn();
    await render(<PetCard occurrence={occurrence} now={now} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: /Thor/ }));
    expect(onPress).toHaveBeenCalled();
  });
});

describe("BottomNav", () => {
  it("mostra as 5 abas do design", async () => {
    await render(<BottomNav active="index" onNavigate={() => {}} />);
    for (const label of ["Início", "Mapa", "Alertas", "Chat", "Perfil"]) {
      expect(screen.getByRole("tab", { name: label })).toBeOnTheScreen();
    }
  });

  it("marca a aba ativa", async () => {
    await render(<BottomNav active="map" onNavigate={() => {}} />);
    expect(screen.getByRole("tab", { name: "Mapa" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Início" })).not.toBeSelected();
  });

  it("navega ao tocar", async () => {
    const onNavigate = jest.fn();
    await render(<BottomNav active="index" onNavigate={onNavigate} />);
    await fireEvent.press(screen.getByRole("tab", { name: "Alertas" }));
    expect(onNavigate).toHaveBeenCalledWith("alerts");
  });
});
