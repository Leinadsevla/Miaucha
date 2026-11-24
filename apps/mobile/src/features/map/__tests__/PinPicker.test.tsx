import { fireEvent, render, screen } from "@testing-library/react-native";
import { cameraCommands, mapEvents } from "@/test-utils/maplibreMock";
import { boundsToRegion } from "../region";

const initialRegion = () => boundsToRegion(screen.getByTestId("map-camera").props.initialViewState.bounds);
import { PinPicker } from "../PinPicker";

const value = { lat: -23.55, lng: -46.63 };

async function setup(v = value) {
  const onChange = jest.fn();
  await render(<PinPicker value={v} onChange={onChange} />);
  return { onChange };
}

beforeEach(() => cameraCommands.fitBounds.mockClear());

// A primeira renderização carrega mapa, ícones e imagens; com a suíte inteira em paralelo passa de 5 s.
jest.setTimeout(15_000);

describe("PinPicker (ajuste do pin ao registrar)", () => {
  it("centraliza o mapa no valor e põe nele um marcador arrastável", async () => {
    await setup();
    expect(initialRegion().latitude).toBeCloseTo(-23.55);
    expect(initialRegion().longitude).toBeCloseTo(-46.63);
    const marker = screen.getByTestId("pin-picker-marker");
    expect(marker.props.draggable).toBe(true);
    expect(marker.props.lngLat).toEqual([-46.63, -23.55]);
  });

  it("arrastar o marcador avisa o novo ponto", async () => {
    const { onChange } = await setup();
    await fireEvent(screen.getByTestId("pin-picker-marker"), "dragEnd", mapEvents.at(-23.551, -46.632));
    expect(onChange).toHaveBeenCalledWith({ lat: -23.551, lng: -46.632 });
  });

  it("tocar no mapa também move o ponto", async () => {
    const { onChange } = await setup();
    await fireEvent.press(screen.getByTestId("pin-picker-map"), mapEvents.at(-23.56, -46.64));
    expect(onChange).toHaveBeenCalledWith({ lat: -23.56, lng: -46.64 });
  });

  it("depois de arrastar, o valor novo vindo do pai não recentraliza o mapa", async () => {
    const { onChange } = await setup();
    await fireEvent(screen.getByTestId("pin-picker-marker"), "dragEnd", mapEvents.at(-23.551, -46.632));
    await screen.rerender(<PinPicker value={{ lat: -23.551, lng: -46.632 }} onChange={onChange} />);
    expect(cameraCommands.fitBounds).not.toHaveBeenCalled();
    expect(screen.getByTestId("pin-picker-marker").props.lngLat).toEqual([-46.632, -23.551]);
  });

  it("explica que no mapa público aparece uma região aproximada", async () => {
    await setup();
    expect(screen.getByText(/região aproximada \(~150 m\)/)).toBeOnTheScreen();
  });

  it("se o valor muda por fora (ex.: localização nova), recentraliza o mapa", async () => {
    const onChange = jest.fn();
    await render(<PinPicker value={value} onChange={onChange} />);
    await screen.rerender(<PinPicker value={{ lat: -22.9, lng: -43.2 }} onChange={onChange} />);
    expect(cameraCommands.fitBounds).toHaveBeenCalledWith(expect.any(Array), { duration: 300 });
    const target = boundsToRegion(cameraCommands.fitBounds.mock.calls[0][0]);
    expect(target.latitude).toBeCloseTo(-22.9);
    expect(target.longitude).toBeCloseTo(-43.2);
  });
});

describe("PinPicker sem ponto ainda (marcar no mapa)", () => {
  it("abre no centro informado, sem marcador, pedindo para tocar na rua; o toque escolhe o ponto", async () => {
    const onChange = jest.fn();
    await render(<PinPicker value={null} center={{ lat: -23.55, lng: -46.63 }} onChange={onChange} />);
    expect(initialRegion().latitude).toBeCloseTo(-23.55);
    expect(initialRegion().longitude).toBeCloseTo(-46.63);
    expect(screen.queryByTestId("pin-picker-marker")).toBeNull();
    expect(screen.getByText("Toque na rua onde o pet foi visto para marcar o local.")).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId("pin-picker-map"), mapEvents.at(-23.551, -46.631));
    expect(onChange).toHaveBeenCalledWith({ lat: -23.551, lng: -46.631 });
  });
});
