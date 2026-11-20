/** Dois projetos: `unit` roda sem Docker; `integration` sobe um PostGIS real (Testcontainers). */
const base = { preset: "ts-jest", testEnvironment: "node" };

module.exports = {
  projects: [
    { ...base, displayName: "unit", testMatch: ["<rootDir>/src/**/*.test.ts"] },
    {
      ...base,
      displayName: "integration",
      testMatch: ["<rootDir>/test/**/*.test.ts"],
      globalSetup: "<rootDir>/test/global-setup.ts",
      globalTeardown: "<rootDir>/test/global-teardown.ts",
      testTimeout: 30000,
    },
  ],
};
