jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
// O mapa nativo (MapLibre) não roda no Jest: Map, Camera e Marker viram Views que repassam as props.
jest.mock("@maplibre/maplibre-react-native", () => require("./src/test-utils/maplibreMock"));
