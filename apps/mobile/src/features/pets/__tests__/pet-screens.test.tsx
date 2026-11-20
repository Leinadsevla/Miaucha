import { fireEvent, render, screen } from "@testing-library/react-native";
import type { MyPet } from "@miaucha/shared";
import { MyPetsCard } from "../MyPetsCard";
import { PetForm } from "../PetForm";
import type { PickedPhoto } from "../photos";

describe("PetForm", () => {
  async function setup(picks: PickedPhoto[][] = []) {
    const onSubmit = jest.fn();
    const onPickPhotos = jest.fn(async (_remaining: number) => picks.shift() ?? []);
    await render(<PetForm onSubmit={onSubmit} onPickPhotos={onPickPhotos} />);
    return { onSubmit, onPickPhotos };
  }

  it("salva com nome e espécie, enviando os textos sem espaços nas pontas", async () => {
    const { onSubmit } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Gato" }));
    await fireEvent.changeText(screen.getByLabelText("Nome do pet"), "  Mia ");
    await fireEvent.changeText(screen.getByLabelText("Raça"), " Persa ");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar pet" }));

    expect(onSubmit).toHaveBeenCalledWith({ name: "Mia", species: "cat", breed: "Persa", color: "", approxAge: "" }, []);
  });

  it("começa com Cão selecionado", async () => {
    await setup();
    expect(screen.getByRole("button", { name: "Cão" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Gato" })).not.toBeSelected();
  });

  it("sem nome, mostra o erro e não envia", async () => {
    const { onSubmit } = await setup();
    await fireEvent.press(screen.getByRole("button", { name: "Salvar pet" }));
    expect(screen.getByText("Informe o nome do pet")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("adiciona fotos escolhidas, pede só as vagas restantes e permite remover", async () => {
    const { onSubmit, onPickPhotos } = await setup([[{ uri: "file:///a.jpg" }, { uri: "file:///b.jpg" }]]);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    expect(onPickPhotos).toHaveBeenCalledWith(5);
    expect(screen.getAllByLabelText(/^Foto \d$/)).toHaveLength(2);

    await fireEvent.press(screen.getByRole("button", { name: "Remover foto 1" }));
    await fireEvent.changeText(screen.getByLabelText("Nome do pet"), "Thor");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar pet" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), [{ uri: "file:///b.jpg" }]);
  });

  it("recusa formato não aceito com mensagem, mantendo as válidas", async () => {
    await setup([[{ uri: "file:///a.heic" }, { uri: "file:///b.png" }]]);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    expect(screen.getByText("Envie uma foto JPG, PNG ou WebP")).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^Foto \d$/)).toHaveLength(1);
  });

  it("com 5 fotos, o botão de adicionar some", async () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ uri: `file:///${n}.jpg` }));
    await setup([five]);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    expect(screen.queryByRole("button", { name: "Adicionar foto" })).toBeNull();
  });

  it("mostra o erro do servidor", async () => {
    await render(<PetForm onSubmit={jest.fn()} onPickPhotos={jest.fn()} serverError="Sua sessão expirou. Entre de novo." />);
    expect(screen.getByText("Sua sessão expirou. Entre de novo.")).toBeOnTheScreen();
  });
});

describe("MyPetsCard", () => {
  const pets: MyPet[] = [
    { id: "1", name: "Thor", species: "dog", breed: "Golden Retriever", color: null, approxAge: null, photos: [{ id: "f", url: "https://x/f.jpg" }] },
    { id: "2", name: "Mia", species: "cat", breed: null, color: null, approxAge: null, photos: [] },
  ];

  it("lista nome e raça dos pets", async () => {
    await render(<MyPetsCard pets={pets} onAdd={jest.fn()} />);
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever")).toBeOnTheScreen();
    expect(screen.getByText("Mia")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de Thor")).toBeOnTheScreen();
  });

  it("sem pets, convida a cadastrar", async () => {
    await render(<MyPetsCard pets={[]} onAdd={jest.fn()} />);
    expect(screen.getByText("Nenhum pet cadastrado ainda")).toBeOnTheScreen();
  });

  it("carregando e erro", async () => {
    await render(<MyPetsCard pets={null} onAdd={jest.fn()} />);
    expect(screen.getByText("Carregando...")).toBeOnTheScreen();
    await render(<MyPetsCard pets={null} error="Sem conexão" onAdd={jest.fn()} />);
    expect(screen.getByText("Sem conexão")).toBeOnTheScreen();
  });

  it("Adicionar chama onAdd", async () => {
    const onAdd = jest.fn();
    await render(<MyPetsCard pets={[]} onAdd={onAdd} />);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar pet" }));
    expect(onAdd).toHaveBeenCalled();
  });
});
