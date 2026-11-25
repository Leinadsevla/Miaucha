import { fireEvent, render, screen } from "@testing-library/react-native";
import { SpeciesIcon } from "@/components";
import { SpeciesSelector } from "../SpeciesSelector";

describe("SpeciesSelector", () => {
  it("Cão, Gato e Outros; 'Outros' mostra as demais espécies e escolhe 'Outro animal' até refinar", async () => {
    const onChange = jest.fn();
    await render(<SpeciesSelector value="dog" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Cão" })).toBeSelected();
    expect(screen.queryByRole("button", { name: "Coelho" })).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Outros" }));
    expect(onChange).toHaveBeenLastCalledWith("other");
  });

  it("com uma espécie de 'Outros' escolhida, a lista aparece e marca a escolhida", async () => {
    const onChange = jest.fn();
    await render(<SpeciesSelector value="bird" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Outros" })).toBeSelected();
    for (const label of ["Pássaro", "Coelho", "Roedor", "Réptil", "Outro animal"]) {
      expect(screen.getByRole("button", { name: label })).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "Pássaro" })).toBeSelected();

    await fireEvent.press(screen.getByRole("button", { name: "Coelho" }));
    expect(onChange).toHaveBeenLastCalledWith("rabbit");
  });

  it("cada espécie tem um ícone próprio", async () => {
    for (const species of ["dog", "cat", "bird", "rabbit", "rodent", "reptile", "other"] as const) {
      await render(<SpeciesIcon species={species} />);
      expect(screen.getByTestId(`species-icon-${species}`, { includeHiddenElements: true })).toBeOnTheScreen();
    }
  });
});
