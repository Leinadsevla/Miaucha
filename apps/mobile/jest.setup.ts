jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
// O mapa nativo não roda no Jest: MapView e Marker viram Views que repassam as props.
jest.mock("react-native-maps", () => require("./src/test-utils/reactNativeMapsMock"));
