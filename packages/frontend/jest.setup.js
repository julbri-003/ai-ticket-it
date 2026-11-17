// Mocks comunes de los tests del front.

// SecureStore en memoria.
jest.mock("expo-secure-store", () => {
  const datos = new Map();
  return {
    __datos: datos,
    getItemAsync: jest.fn(async (clave) => (datos.has(clave) ? datos.get(clave) : null)),
    setItemAsync: jest.fn(async (clave, valor) => {
      datos.set(clave, valor);
    }),
    deleteItemAsync: jest.fn(async (clave) => {
      datos.delete(clave);
    }),
  };
});

jest.mock(
  "react-native-safe-area-context",
  () => require("react-native-safe-area-context/jest/mock").default,
);

// El socket no se usa todavía (iteración 10).
jest.mock("socket.io-client", () => ({
  io: jest.fn(() => ({ connect: jest.fn(), on: jest.fn() })),
}));
