import { createRef } from "react";
import { Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { cameraCommands, mapEvents } from "@/test-utils/maplibreMock";
import { DraggablePoint, MAP_STYLE_URL, MapCanvas, MapPoint, type MapCanvasRef } from "../MapCanvas";
import { regionToBounds, type Region } from "../region";

const sp: Region = { latitude: -23.55, longitude: -46.63, latitudeDelta: 0.02, longitudeDelta: 0.04 };

beforeEach(() => cameraCommands.fitBounds.mockClear());

describe("MapCanvas (mapa MapLibre com mapas do OpenStreetMap)", () => {
  it("usa o estilo gratuito do OpenFreeMap, sem girar nem inclinar", async () => {
    await render(<MapCanvas initialRegion={sp} />);
    const map = screen.getByTestId("map-view");
    expect(map.props.mapStyle).toBe(MAP_STYLE_URL);
    expect(MAP_STYLE_URL).toMatch(/^https:\/\/tiles\.openfreemap\.org\//);
    expect(map.props.touchRotate).toBe(false);
    expect(map.props.touchPitch).toBe(false);
  });

  it("abre mostrando a região inicial", async () => {
    await render(<MapCanvas initialRegion={sp} />);
    expect(screen.getByTestId("map-camera").props.initialViewState).toEqual({ bounds: regionToBounds(sp) });
  });

  it("avisa a região visível quando o mapa para de mexer", async () => {
    const onRegionChangeComplete = jest.fn();
    await render(<MapCanvas initialRegion={sp} onRegionChangeComplete={onRegionChangeComplete} />);
    await fireEvent(screen.getByTestId("map-view"), "regionDidChange", mapEvents.region(sp));
    const [region] = onRegionChangeComplete.mock.calls[0];
    expect(region.latitude).toBeCloseTo(sp.latitude);
    expect(region.longitude).toBeCloseTo(sp.longitude);
    expect(region.latitudeDelta).toBeCloseTo(sp.latitudeDelta);
    expect(region.longitudeDelta).toBeCloseTo(sp.longitudeDelta);
  });

  it("toque no mapa devolve o ponto em lat/lng", async () => {
    const onPress = jest.fn();
    await render(<MapCanvas initialRegion={sp} onPress={onPress} />);
    await fireEvent.press(screen.getByTestId("map-view"), mapEvents.at(-23.56, -46.64));
    expect(onPress).toHaveBeenCalledWith({ lat: -23.56, lng: -46.64 });
  });

  it("animateToRegion leva a câmera até a região, com a duração pedida", async () => {
    const ref = createRef<MapCanvasRef>();
    await render(<MapCanvas ref={ref} initialRegion={sp} />);
    ref.current!.animateToRegion(sp, 400);
    expect(cameraCommands.fitBounds).toHaveBeenCalledWith(regionToBounds(sp), { duration: 400 });
  });

  it("mostra a posição do usuário só quando pedido", async () => {
    await render(<MapCanvas initialRegion={sp} />);
    expect(screen.queryByTestId("map-user-location")).toBeNull();
    await screen.rerender(<MapCanvas initialRegion={sp} showsUserLocation />);
    expect(screen.getByTestId("map-user-location")).toBeOnTheScreen();
  });
});

describe("MapPoint e DraggablePoint", () => {
  it("MapPoint fica no ponto (lng, lat), com a âncora pedida, e avisa o toque", async () => {
    const onPress = jest.fn();
    await render(
      <MapCanvas initialRegion={sp}>
        <MapPoint testID="ponto" coordinate={{ lat: -23.55, lng: -46.63 }} anchor="bottom" onPress={onPress}>
          <Text>pin</Text>
        </MapPoint>
      </MapCanvas>,
    );
    const point = screen.getByTestId("ponto");
    expect(point.props.lngLat).toEqual([-46.63, -23.55]);
    expect(point.props.anchor).toBe("bottom");
    await fireEvent.press(point);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("DraggablePoint é arrastável e devolve o ponto novo em lat/lng", async () => {
    const onDragEnd = jest.fn();
    await render(
      <MapCanvas initialRegion={sp}>
        <DraggablePoint testID="arrastavel" coordinate={{ lat: -23.55, lng: -46.63 }} onDragEnd={onDragEnd}>
          <Text>pin</Text>
        </DraggablePoint>
      </MapCanvas>,
    );
    const point = screen.getByTestId("arrastavel");
    expect(point.props.draggable).toBe(true);
    expect(point.props.lngLat).toEqual([-46.63, -23.55]);
    await fireEvent(point, "dragEnd", mapEvents.at(-23.551, -46.632));
    expect(onDragEnd).toHaveBeenCalledWith({ lat: -23.551, lng: -46.632 });
  });
});
