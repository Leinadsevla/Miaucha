import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PublicOccurrence } from "@miaucha/shared";
import { ProfileView } from "../ProfileView";

const now = new Date("2026-11-20T12:00:00Z");

const occ = (id: string, data: Partial<PublicOccurrence> = {}): PublicOccurrence => ({
  id,
  type: "lost",
  species: "dog",
  petName: `Pet ${id}`,
  breed: null,
  color: null,
  description: null,
  photoUrls: [],
  publicLocation: { lat: 0, lng: 0 },
  approxAddress: null,
  authorPseudonym: "Tutor Laranja 42",
  status: "open",
  isMine: true,
  createdAt: "2026-11-20T10:00:00Z",
  ...data,
});

function props(overrides: Partial<Parameters<typeof ProfileView>[0]> = {}) {
  return {
    name: "Ana Souza",
    profile: { id: "u1", name: "Ana Souza", pseudonym: "Tutor Laranja 42", petCount: 2, occurrenceCount: 3 },
    pets: [],
    occurrences: [occ("1"), occ("2", { status: "resolved", type: "found", petName: null, species: "cat" })],
    now,
    onAddPet: jest.fn(),
    onOpenPet: jest.fn(),
    onOpenOccurrence: jest.fn(),
    onOpenAlertPreferences: jest.fn(),
    onOpenPrivacy: jest.fn(),
    onOpenHelp: jest.fn(),
    onLogout: jest.fn(),
    ...overrides,
  };
}

describe("ProfileView (aba Perfil)", () => {
  it("mostra nome, pseudônimo público e contadores, sem e-mail", async () => {
    await render(<ProfileView {...props()} />);
    expect(screen.getByText("Ana Souza")).toBeOnTheScreen();
    expect(screen.getByText("Tutor Laranja 42")).toBeOnTheScreen();
    expect(screen.getByLabelText("2 pets")).toBeOnTheScreen();
    expect(screen.getByLabelText("3 ocorrências")).toBeOnTheScreen();
    expect(screen.queryByText(/@/)).toBeNull();
  });

  it("sem o perfil ainda: contadores com traço", async () => {
    await render(<ProfileView {...props({ profile: null })} />);
    expect(screen.getAllByText("–")).toHaveLength(2);
  });

  it("Minhas ocorrências: lista com tipo e situação, e abre o detalhe", async () => {
    await render(<ProfileView {...props()} />);
    expect(screen.getByText("Minhas ocorrências")).toBeOnTheScreen();
    expect(screen.getByText("Pet 1")).toBeOnTheScreen();
    expect(screen.getByText("Gato sem nome")).toBeOnTheScreen();
    expect(screen.getByText("Resolvida")).toBeOnTheScreen();
    expect(screen.getAllByText("2h atrás")).toHaveLength(2);
  });

  it("tocar numa ocorrência chama onOpenOccurrence com o id", async () => {
    const p = props();
    await render(<ProfileView {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: /Gato sem nome/ }));
    expect(p.onOpenOccurrence).toHaveBeenCalledWith("2");
  });

  it("estados de Minhas ocorrências: carregando, vazio e erro", async () => {
    const view = await render(<ProfileView {...props({ occurrences: null })} />);
    expect(screen.getByText("Carregando ocorrências...")).toBeOnTheScreen();
    await view.rerender(<ProfileView {...props({ occurrences: [] })} />);
    expect(screen.getByText("Você ainda não registrou nenhuma ocorrência")).toBeOnTheScreen();
    await view.rerender(<ProfileView {...props({ occurrences: null, occurrencesError: "Sem conexão" })} />);
    expect(screen.getByText("Sem conexão")).toBeOnTheScreen();
  });

  it("configurações levam às telas certas", async () => {
    const p = props();
    await render(<ProfileView {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Notificações" }));
    await fireEvent.press(screen.getByRole("button", { name: "Localização" }));
    expect(p.onOpenAlertPreferences).toHaveBeenCalledTimes(2);
    await fireEvent.press(screen.getByRole("button", { name: "Política de privacidade" }));
    expect(p.onOpenPrivacy).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Ajuda" }));
    expect(p.onOpenHelp).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole("button", { name: "Sair da conta" }));
    expect(p.onLogout).toHaveBeenCalled();
  });

  it("mantém o card Meus Pets", async () => {
    const p = props();
    await render(<ProfileView {...p} />);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar pet" }));
    expect(p.onAddPet).toHaveBeenCalled();
  });
});
