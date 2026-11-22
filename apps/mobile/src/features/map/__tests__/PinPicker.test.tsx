import { fireEvent, render, screen } from "@testing-library/react-native";
import { mapCommands } from "@/test-utils/reactNativeMapsMock";
import { PinPicker } from "../PinPicker";

const value = { lat: -23.55, lng: -46.63 };

async function setup(v = value) {
  const onChange = jest.fn();
  await render(<PinPicker value={v} onChange={onChange} />);
  return { onChange };
}

beforeEach(() => mapCommands.animateToRegion.mockClear());

describe("PinPicker (ajuste do pin ao registrar)", () => {
  it("centraliza o mapa no valor e põe nele um marcador arrastável", async () => {
    await setup();
    expect(screen.getByTestId("pin-picker-map").props.initialRegion).toMatchObject({ latitude: -23.55, longitude: -46.63 });
    const marker = screen.getByTestId("pin-picker-marker");
    expect(marker.props.draggable).toBe(true);
    expect(marker.props.coordinate).toEqual({ latitude: -23.55, longitude: -46.63 });
  });

  it("arrastar o marcador avisa o novo ponto", async () => {
    const { onChange } = await setup();
    await fireEvent(screen.getByTestId("pin-picker-marker"), "dragEnd", {
      nativeEvent: { coordinate: { latitude: -23.551, longitude: -46.632 } },
    });
    expect(onChange).toHaveBeenCalledWith({ lat: -23.551, lng: -46.632 });
  });

  it("tocar no mapa também move o ponto", async () => {
    const { onChange } = await setup();
    await fireEvent.press(screen.getByTestId("pin-picker-map"), {
      nativeEvent: { coordinate: { latitude: -23.56, longitude: -46.64 } },
    });
    expect(onChange).toHaveBeenCalledWith({ lat: -23.56, lng: -46.64 });
  });

  it("depois de arrastar, o valor novo vindo do pai não recentraliza o mapa", async () => {
    const { onChange } = await setup();
    await fireEvent(screen.getByTestId("pin-picker-marker"), "dragEnd", {
      nativeEvent: { coordinate: { latitude: -23.551, longitude: -46.632 } },
    });
    await screen.rerender(<PinPicker value={{ lat: -23.551, lng: -46.632 }} onChange={onChange} />);
    expect(mapCommands.animateToRegion).not.toHaveBeenCalled();
    expect(screen.getByTestId("pin-picker-marker").props.coordinate).toEqual({ latitude: -23.551, longitude: -46.632 });
  });

  it("explica que no mapa público aparece uma região aproximada", async () => {
    await setup();
    expect(screen.getByText(/região aproximada \(~150 m\)/)).toBeOnTheScreen();
  });

  it("se o valor muda por fora (ex.: localização nova), recentraliza o mapa", async () => {
    const onChange = jest.fn();
    await render(<PinPicker value={value} onChange={onChange} />);
    await screen.rerender(<PinPicker value={{ lat: -22.9, lng: -43.2 }} onChange={onChange} />);
    expect(mapCommands.animateToRegion).toHaveBeenCalledWith(expect.objectContaining({ latitude: -22.9, longitude: -43.2 }), 300);
  });
});
