import { fireEvent, render, screen } from "@testing-library/react-native";
import type { MyPet } from "@miaucha/shared";
import { MyPetsCard } from "../MyPetsCard";
import { PetDetails } from "../PetDetails";
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

    expect(onSubmit).toHaveBeenCalledWith({ name: "Mia", species: "cat", breed: "Persa", color: "", approxAge: "" }, [], []);
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
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), [{ uri: "file:///b.jpg" }], []);
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

describe("PetForm em modo edição", () => {
  const initial = { name: "Thor", species: "dog" as const, breed: "Golden", color: "", approxAge: "3 anos" };
  const saved = [
    { id: "f1", url: "https://x/1.jpg" },
    { id: "f2", url: "https://x/2.jpg" },
  ];

  it("começa preenchido, com as fotos salvas, e salva as alterações e as fotos marcadas para remover", async () => {
    const onSubmit = jest.fn();
    const onPickPhotos = jest.fn(async () => [{ uri: "file:///nova.jpg" }]);
    await render(<PetForm initial={initial} existingPhotos={saved} submitLabel="Salvar alterações" onSubmit={onSubmit} onPickPhotos={onPickPhotos} />);

    expect(screen.getByLabelText("Nome do pet").props.value).toBe("Thor");
    expect(screen.getByLabelText("Foto salva 1")).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Remover foto salva 1" }));
    expect(screen.queryByLabelText("Foto salva 2")).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar foto" }));
    expect(onPickPhotos).toHaveBeenCalledWith(4);
    await fireEvent.changeText(screen.getByLabelText("Cor predominante"), "Dourado");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(onSubmit).toHaveBeenCalledWith({ ...initial, color: "Dourado" }, [{ uri: "file:///nova.jpg" }], ["f1"]);
  });

  it("fotos salvas contam no limite de 5", async () => {
    const five = [1, 2, 3, 4, 5].map((n) => ({ id: `f${n}`, url: `https://x/${n}.jpg` }));
    await render(<PetForm initial={initial} existingPhotos={five} onSubmit={jest.fn()} onPickPhotos={jest.fn()} />);
    expect(screen.queryByRole("button", { name: "Adicionar foto" })).toBeNull();
  });
});

describe("MyPetsCard", () => {
  const pets: MyPet[] = [
    { id: "1", name: "Thor", species: "dog", breed: "Golden Retriever", color: null, approxAge: null, photos: [{ id: "f", url: "https://x/f.jpg" }] },
    { id: "2", name: "Mia", species: "cat", breed: null, color: null, approxAge: null, photos: [] },
  ];

  it("lista nome e raça dos pets", async () => {
    await render(<MyPetsCard pets={pets} onAdd={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText("Thor")).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever")).toBeOnTheScreen();
    expect(screen.getByText("Mia")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto de Thor")).toBeOnTheScreen();
  });

  it("sem pets, convida a cadastrar", async () => {
    await render(<MyPetsCard pets={[]} onAdd={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText("Nenhum pet cadastrado ainda")).toBeOnTheScreen();
  });

  it("carregando e erro", async () => {
    await render(<MyPetsCard pets={null} onAdd={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText("Carregando...")).toBeOnTheScreen();
    await render(<MyPetsCard pets={null} error="Sem conexão" onAdd={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByText("Sem conexão")).toBeOnTheScreen();
  });

  it("tocar num pet abre os detalhes dele", async () => {
    const onOpen = jest.fn();
    await render(<MyPetsCard pets={pets} onAdd={jest.fn()} onOpen={onOpen} />);
    await fireEvent.press(screen.getByRole("button", { name: "Ver Mia" }));
    expect(onOpen).toHaveBeenCalledWith("2");
  });

  it("Adicionar chama onAdd", async () => {
    const onAdd = jest.fn();
    await render(<MyPetsCard pets={[]} onAdd={onAdd} onOpen={jest.fn()} />);
    await fireEvent.press(screen.getByRole("button", { name: "Adicionar pet" }));
    expect(onAdd).toHaveBeenCalled();
  });
});

describe("PetDetails", () => {
  const thor: MyPet = {
    id: "1",
    name: "Thor",
    species: "dog",
    breed: "Golden Retriever",
    color: "Dourado",
    approxAge: "3 anos",
    photos: [
      { id: "a", url: "https://x/a.jpg" },
      { id: "b", url: "https://x/b.jpg" },
    ],
  };

  it("mostra nome, raça e cor, todas as fotos e a grade de informações", async () => {
    await render(<PetDetails pet={thor} onBack={jest.fn()} />);
    expect(screen.getByRole("header", { name: "Thor" })).toBeOnTheScreen();
    expect(screen.getByText("Golden Retriever · Dourado")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto 1 de 2 de Thor")).toBeOnTheScreen();
    expect(screen.getByLabelText("Foto 2 de 2 de Thor")).toBeOnTheScreen();
    expect(screen.getByText("Cão")).toBeOnTheScreen();
    expect(screen.getByText("3 anos")).toBeOnTheScreen();
  });

  it("campos vazios aparecem como 'Não informado' e, sem foto, mostra o ícone da espécie", async () => {
    await render(<PetDetails pet={{ ...thor, species: "cat", breed: null, color: null, approxAge: null, photos: [] }} onBack={jest.fn()} />);
    expect(screen.getAllByText("Não informado")).toHaveLength(3);
    expect(screen.getByLabelText("Thor ainda não tem foto")).toBeOnTheScreen();
    expect(screen.getByText("Gato")).toBeOnTheScreen();
  });

  it("Editar chama onEdit", async () => {
    const onEdit = jest.fn();
    await render(<PetDetails pet={thor} onBack={jest.fn()} onEdit={onEdit} />);
    await fireEvent.press(screen.getByRole("button", { name: "Editar Thor" }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("Voltar chama onBack", async () => {
    const onBack = jest.fn();
    await render(<PetDetails pet={thor} onBack={onBack} />);
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalled();
  });
});
