const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Módulos nativos que não existem no navegador: na web o Metro entrega um substituto no lugar.
const webStubs = {
  "expo-secure-store": path.resolve(__dirname, "src/web-stubs/expo-secure-store.ts"),
};
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && webStubs[moduleName]) {
    return { type: "sourceFile", filePath: webStubs[moduleName] };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
