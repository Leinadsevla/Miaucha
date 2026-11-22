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

describe("OccurrenceForm: escolher um dos meus pets", () => {
  const myPets = [
    { id: "p1", name: "Thor", species: "dog" as const, breed: "Golden", color: "Dourado", approxAge: null, photos: [] },
    { id: "p2", name: "Mia", species: "cat" as const, breed: null, color: "Branca", approxAge: null, photos: [{ id: "f", url: "https://x/f.jpg" }] },
  ];

  it("em 'Perdi meu pet' lista os meus pets; escolher um preenche os dados e envia o petId", async () => {
    const { onSubmit } = await setup({ myPets });
    expect(screen.getByRole("button", { name: "Thor" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Outro pet" })).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Mia" }));
    expect(screen.getByRole("button", { name: "Mia" })).toBeSelected();
    expect(screen.getByLabelText("Nome do pet")).toHaveDisplayValue("Mia");
    expect(screen.getByRole("button", { name: "Gato" })).toBeSelected();
    expect(screen.getByText("Dados de Mia preenchidos pelo cadastro. A foto do cadastro entra no alerta.")).toBeOnTheScreen();

    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ petId: "p2", petName: "Mia", species: "cat", color: "Branca" }), []);
  });

  it("'Outro pet' limpa a escolha e não envia petId", async () => {
    const { onSubmit } = await setup({ myPets });
    await fireEvent.press(screen.getByRole("button", { name: "Thor" }));
    await fireEvent.press(screen.getByRole("button", { name: "Outro pet" }));
    expect(screen.getByLabelText("Nome do pet")).toHaveDisplayValue("");
    await fireEvent.changeText(screen.getByLabelText("Nome do pet"), "Bidu");
    await emit();
    expect(onSubmit.mock.calls[0][0].petId).toBeUndefined();
  });

  it("'Vi um pet' esconde os meus pets e não envia petId", async () => {
    const { onSubmit } = await setup({ myPets });
    await fireEvent.press(screen.getByRole("button", { name: "Thor" }));
    await fireEvent.press(screen.getByRole("button", { name: "Vi um pet" }));
    expect(screen.queryByRole("button", { name: "Thor" })).toBeNull();
    await emit();
    expect(onSubmit.mock.calls[0][0].petId).toBeUndefined();
  });

  it("sem pets cadastrados, não mostra a escolha", async () => {
    await setup({ myPets: [] });
    expect(screen.queryByRole("button", { name: "Outro pet" })).toBeNull();
  });
});

describe("OccurrenceForm: local por endereço", () => {
  const paulista = { lat: -23.5617, lng: -46.6559 };

  async function fill() {
    await fireEvent.changeText(screen.getByLabelText("Nome do pet"), "Thor");
    await fireEvent.press(screen.getByRole("button", { name: "Outro endereço" }));
  }

  it("começa na minha localização; em 'Outro endereço', procura e usa o ponto encontrado", async () => {
    const onGeocode = jest.fn(async () => paulista);
    const { onSubmit } = await setup({ onGeocode });
    expect(screen.getByRole("button", { name: "Minha localização" })).toBeSelected();

    await fill();
    await fireEvent.changeText(screen.getByLabelText("Endereço"), " Av. Paulista, 1578, São Paulo ");
    await fireEvent.press(screen.getByRole("button", { name: "Procurar endereço" }));
    expect(onGeocode).toHaveBeenCalledWith("Av. Paulista, 1578, São Paulo");
    expect(await screen.findByText("Endereço encontrado. No mapa aparece uma região aproximada (~150 m).")).toBeOnTheScreen();

    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ...paulista, approxAddress: "Av. Paulista, 1578, São Paulo" }), []);
  });

  it("endereço não encontrado → mensagem e não emite", async () => {
    const { onSubmit } = await setup({ onGeocode: async () => null });
    await fill();
    await fireEvent.changeText(screen.getByLabelText("Endereço"), "lugar que não existe");
    await fireEvent.press(screen.getByRole("button", { name: "Procurar endereço" }));
    expect(await screen.findByText("Não encontramos esse endereço. Tente com rua, número e cidade.")).toBeOnTheScreen();
    await emit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("emitir sem procurar, ou depois de mudar o texto, pede para procurar de novo", async () => {
    const { onSubmit } = await setup({ onGeocode: async () => paulista });
    await fill();
    await fireEvent.changeText(screen.getByLabelText("Endereço"), "Av. Paulista, 1578");
    await emit();
    expect(screen.getByText("Procure o endereço para marcar o local")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Procurar endereço" }));
    await fireEvent.changeText(screen.getByLabelText("Endereço"), "Rua Augusta, 100");
    await emit();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("em 'Outro endereço', localização negada não impede o alerta", async () => {
    const { onSubmit } = await setup({ location: { status: "denied", canAskAgain: true }, onGeocode: async () => paulista });
    await fill();
    await fireEvent.changeText(screen.getByLabelText("Endereço"), "Av. Paulista, 1578");
    await fireEvent.press(screen.getByRole("button", { name: "Procurar endereço" }));
    await screen.findByText("Endereço encontrado. No mapa aparece uma região aproximada (~150 m).");
    await emit();
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining(paulista), []);
  });
});
