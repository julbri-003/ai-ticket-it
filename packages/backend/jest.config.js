export default {
  testEnvironment: "node",
  transform: {},
  setupFiles: ["./tests/setupEnv.js"],
  testMatch: ["**/tests/**/*.test.js"],
  // La primera vez mongodb-memory-server descarga el binario de MongoDB.
  testTimeout: 120000,
  // v8: la instrumentación de babel no funciona con ESM nativo (transform: {}).
  coverageProvider: "v8",
  collectCoverageFrom: ["domain/**/*.js"],
  coverageThreshold: {
    "./domain/": { statements: 90, branches: 90, functions: 90, lines: 90 },
  },
};
