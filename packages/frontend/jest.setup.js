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

// Gestos (swipe de favoritos) y animaciones de reanimated.
require("react-native-gesture-handler/jestSetup");
// ReanimatedSwipeable necesita los worklets nativos de reanimated 4: en los tests se reemplaza por
// un contenedor que muestra el contenido y las acciones (el gesto en sí no se prueba en Jest).
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const { View } = require("react-native");
  function SwipeableFalso({ children, renderRightActions }) {
    return (
      <View>
        {children}
        {renderRightActions ? renderRightActions() : null}
      </View>
    );
  }
  return { __esModule: true, default: SwipeableFalso };
});
