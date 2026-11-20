import { fireEvent, render, screen } from "@testing-library/react-native";
import type { LocationResult } from "@/features/location/currentLocation";
import type { PickedPhoto } from "@/features/pets/photos";
import { OccurrenceForm, type OccurrenceFormProps } from "../OccurrenceForm";

const here: LocationResult = { status: "ok", coords: { lat: -23.5614, lng: -46.6559 } };

async function setup(props: Partial<OccurrenceFormProps> = {}, picks: PickedPhoto[][] = []) {
  const onSubmit = jest.fn();
  const onRetryLocation = jest.fn();
  const onPickPhotos = jest.fn(async (_remaining: number) => picks.shift() ?? []);
  await render(<OccurrenceForm location={here} onSubmit={onSubmit} onPickPhotos={onPickPhotos} onRetryLocation={onRetryLocation} {...props} />);
  return { onSubmit, onRetryLocation, onPickPhotos };
}

const emit = () => fireEvent.press(screen.getByRole("button", { name: "Emitir alerta" }));

describe("OccurrenceForm (registrar ocorrência)", () => {
  it("começa em 'Perdi meu pet' e Cão", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Perdi meu pet" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Vi um pet" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Encontrei um pet" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Cão" })).toBeSelected();
  });

  it("emite o alerta com os dados digitados (sem espaços nas pontas) e a localização atual", async () => {
    const { onSubmit } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Gato" }));
    await fireEvent.changeText(screen.getByLabelText("Nome do pet"), " Mia ");
    await fireEvent.changeText(screen.getByLabelText("Raça"), "Persa");
    await fireEvent.changeText(screen.getByLabelText("Cor predominante"), "Branca");
    await fireEvent.changeText(screen.getByLabelText("Endereço aproximado"), " Av. Paulista, perto do MASP ");
    await fireEvent.changeText(screen.getByLabelText("Descrição"), "Coleira rosa");
    await emit();

    expect(onSubmit).toHaveBeenCalledWith(
      {
        type: "lost",
        species: "cat",
        petName: "Mia",
        breed: "Persa",
        color: "Branca",
        approxAddress: "Av. Paulista, perto do MASP",
        description: "Coleira rosa",
        lat: -23.5614,
        lng: -46.6559,
      },
      [],
    );
  });

  it("perdido sem nome → erro e não envia", async () => {
    const { onSubmit } = await setup();
    await emit();
    expect(screen.getByText("Informe o nome do pet")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("'Vi um pet' não exige nome", async () => {
    const { onSubmit } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Vi um pet" }));
    expect(screen.getByLabelText("Nome do pet (se souber)")).toBeOnTheScreen();
    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: "seen", petName: "" }), []);
  });

  it("enquanto busca a localização, avisa; emitir sem local mostra o erro", async () => {
    const { onSubmit } = await setup({ location: null, initial: { petName: "Thor" } });
    expect(screen.getByText("Buscando sua localização...")).toBeOnTheScreen();
    await emit();
    expect(screen.getByText("Não foi possível obter o local. Ative a localização e tente de novo.")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("com localização, diz que vai usar o local atual", async () => {
    await setup();
    expect(screen.getByText("Usando sua localização atual. No mapa, aparece uma região aproximada (~150 m).")).toBeOnTheScreen();
  });

  it("localização negada: explica e tenta de novo", async () => {
    const { onRetryLocation } = await setup({ location: { status: "denied", canAskAgain: true } });
    expect(screen.getByText(/Precisamos da sua localização para marcar onde o pet foi visto/)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onRetryLocation).toHaveBeenCalled();
  });

  it("pré-preenchido a partir de um pet do usuário, enviando o petId", async () => {
    const { onSubmit } = await setup({
      initial: { species: "cat", petName: "Mia", breed: "Persa", color: "Branca" },
      fromPet: { id: "p1", name: "Mia", photoCount: 2 },
    });
    expect(screen.getByLabelText("Nome do pet")).toHaveDisplayValue("Mia");
    expect(screen.getByRole("button", { name: "Gato" })).toBeSelected();
    expect(screen.getByText("Dados de Mia preenchidos pelo cadastro. As 2 fotos do cadastro entram no alerta.")).toBeOnTheScreen();
    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ petId: "p1", petName: "Mia", breed: "Persa" }), []);
  });

  it("adiciona e remove fotos (até 5)", async () => {
    const { onSubmit, onPickPhotos } = await setup({ initial: { petName: "Thor" } }, [[{ uri: "file:///a.jpg" }, { uri: "file:///b.jpg" }]]);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    expect(onPickPhotos).toHaveBeenCalledWith(5);
    await fireEvent.press(screen.getByRole("button", { name: "Remover foto 1" }));
    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), [{ uri: "file:///b.jpg" }]);
  });

  it("mostra o erro do servidor e o botão carregando", async () => {
    await setup({ serverError: "Muitas tentativas. Espere um pouco e tente de novo.", loading: true });
    expect(screen.getByText("Muitas tentativas. Espere um pouco e tente de novo.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Emitir alerta" })).toBeDisabled();
  });
});
