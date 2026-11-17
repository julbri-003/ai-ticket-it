import { render, screen } from "@testing-library/react-native";
import App from "../App";
import { obtenerEstadoBackend } from "../src/service/healthService";

jest.mock("../src/service/healthService", () => ({
  obtenerEstadoBackend: jest.fn(),
}));

describe("App (humo)", () => {
  afterEach(() => jest.clearAllMocks());

  test("muestra 'ok' cuando el back responde el health", async () => {
    obtenerEstadoBackend.mockResolvedValue("ok");

    await render(<App />);

    expect(await screen.findByText("✓ ok")).toBeTruthy();
    expect(obtenerEstadoBackend).toHaveBeenCalledTimes(1);
  });

  test("muestra el error cuando el back no responde", async () => {
    obtenerEstadoBackend.mockRejectedValue(new Error("No pudimos conectarnos con el servidor"));

    await render(<App />);

    expect(await screen.findByText("✕ Error: No pudimos conectarnos con el servidor")).toBeTruthy();
  });
});
