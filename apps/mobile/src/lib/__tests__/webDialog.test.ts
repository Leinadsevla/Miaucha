import { runWebDialog } from "../webDialog";

function browser(answer: boolean) {
  return { confirm: jest.fn((_: string) => answer), alert: jest.fn((_: string) => {}) };
}

describe("runWebDialog (Alert.alert não faz nada no navegador)", () => {
  it("só aviso: mostra título e mensagem com alert e chama o botão OK", () => {
    const b = browser(true);
    const ok = jest.fn();
    runWebDialog("Pet salvo", "Uma foto não foi enviada.", [{ text: "OK", onPress: ok }], undefined, b);
    expect(b.alert).toHaveBeenCalledWith("Pet salvo\n\nUma foto não foi enviada.");
    expect(b.confirm).not.toHaveBeenCalled();
    expect(ok).toHaveBeenCalled();
  });

  it("sem botões também é só aviso", () => {
    const b = browser(true);
    runWebDialog("Pronto", undefined, undefined, undefined, b);
    expect(b.alert).toHaveBeenCalledWith("Pronto");
  });

  it("ação + cancelar: OK executa a ação", () => {
    const b = browser(true);
    const action = jest.fn();
    const cancel = jest.fn();
    runWebDialog("Marcar como resolvido?", "A ocorrência sai do mapa.", [
      { text: "Cancelar", style: "cancel", onPress: cancel },
      { text: "Marcar como resolvido", onPress: action },
    ], undefined, b);
    expect(b.confirm).toHaveBeenCalledWith("Marcar como resolvido?\n\nA ocorrência sai do mapa.");
    expect(action).toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
  });

  it("ação + cancelar: Cancelar chama o cancelar e o onDismiss", () => {
    const b = browser(false);
    const action = jest.fn();
    const cancel = jest.fn();
    const onDismiss = jest.fn();
    runWebDialog("Bloquear?", "", [
      { text: "Cancelar", style: "cancel", onPress: cancel },
      { text: "Bloquear", style: "destructive", onPress: action },
    ], { onDismiss }, b);
    expect(action).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalled();
  });

  it("várias ações (ex.: Google Maps, Waze): OK usa a primeira e o texto diz qual", () => {
    const b = browser(true);
    const google = jest.fn();
    const waze = jest.fn();
    runWebDialog("Como chegar", "O destino é a região aproximada.", [
      { text: "Google Maps", onPress: google },
      { text: "Waze", onPress: waze },
      { text: "Cancelar", style: "cancel" },
    ], undefined, b);
    expect(b.confirm).toHaveBeenCalledWith("Como chegar\n\nO destino é a região aproximada.\n\nOK abre: Google Maps");
    expect(google).toHaveBeenCalled();
    expect(waze).not.toHaveBeenCalled();
  });
});
