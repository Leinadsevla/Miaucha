import { fireEvent, render, screen } from "@testing-library/react-native";
import { OccurrenceManageActions } from "../OccurrenceManageActions";

const handlers = () => ({ onResolve: jest.fn(), onDelete: jest.fn() });

describe("OccurrenceManageActions (finalizar e apagar, na edição)", () => {
  it("aberta: mostra 'Marcar como resolvida' e 'Apagar ocorrência', cada um com a sua ação", async () => {
    const h = handlers();
    await render(<OccurrenceManageActions resolved={false} {...h} />);
    expect(screen.getByText("A ocorrência sai do mapa e da lista, mas continua no seu histórico.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Marcar como resolvida"));
    expect(h.onResolve).toHaveBeenCalledTimes(1);
    expect(h.onDelete).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText("Apagar ocorrência"));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
  });

  it("resolvida: só dá para apagar", async () => {
    await render(<OccurrenceManageActions resolved {...handlers()} />);
    expect(screen.queryByText("Marcar como resolvida")).toBeNull();
    expect(screen.getByText("Apagar ocorrência")).toBeOnTheScreen();
  });

  it("enquanto uma ação roda, nenhuma das duas pode ser tocada de novo", async () => {
    const h = handlers();
    await render(<OccurrenceManageActions resolved={false} {...h} busy="delete" />);
    await fireEvent.press(screen.getByText("Marcar como resolvida"));
    expect(h.onResolve).not.toHaveBeenCalled();
    expect(h.onDelete).not.toHaveBeenCalled();
  });

  it("mostra o erro da última ação", async () => {
    await render(<OccurrenceManageActions resolved={false} {...handlers()} error="Não foi possível apagar" />);
    expect(screen.getByText("Não foi possível apagar")).toBeOnTheScreen();
  });
});
