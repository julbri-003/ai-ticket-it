import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import * as SecureStore from "expo-secure-store";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { Login } from "../src/features/auth/Login";
import { apiCaller } from "../src/service/apis/apiCaller";
import { apiFalsa, usuarioComprador } from "../pruebas/apiFalsa";
import { renderConTema } from "../pruebas/helpers";

function EstadoSesion() {
  const { usuario, cargando, esComprador } = useAuth();
  if (cargando) return <Text>cargando</Text>;
  return (
    <Text>
      {usuario
        ? `sesión de ${usuario.nombreCompleto} (${esComprador ? "comprador" : "otro"})`
        : "sin sesión"}
    </Text>
  );
}

beforeEach(() => {
  SecureStore.__datos.clear();
});

describe("Login", () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn() };
  const renderLogin = () =>
    renderConTema(
      <AuthProvider>
        <Login navigation={navigation} />
      </AuthProvider>,
    );

  test("valida inline antes de llamar al back", async () => {
    const llamadas = apiFalsa({});
    await renderLogin();
    await fireEvent.press(screen.getByTestId("login-enviar"));
    expect(screen.getByText("Ingresá tu email.")).toBeTruthy();
    expect(screen.getByText("Ingresá tu contraseña.")).toBeTruthy();
    expect(llamadas).toHaveLength(0);
  });

  test("muestra el error del back en un Toast", async () => {
    apiFalsa({
      "POST /auth/login": () => [401, { status: "fail", message: "Credenciales inválidas" }],
    });
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-email"), "ana@ticketit.test");
    await fireEvent.changeText(screen.getByTestId("login-password"), "mala");
    await fireEvent.press(screen.getByTestId("login-enviar"));
    expect(await screen.findByText("Credenciales inválidas")).toBeTruthy();
    expect(screen.getByText("No pudimos iniciar sesión")).toBeTruthy();
    expect(await SecureStore.getItemAsync("ati_auth_token")).toBeNull();
  });

  test("con credenciales correctas guarda el token y saluda", async () => {
    apiFalsa({
      "POST /auth/login": () => [200, { token: "jwt-ok", usuario: usuarioComprador }],
    });
    await renderLogin();
    await fireEvent.changeText(screen.getByTestId("login-email"), "ana@ticketit.test");
    await fireEvent.changeText(screen.getByTestId("login-password"), "Ticket123!");
    await fireEvent.press(screen.getByTestId("login-enviar"));
    expect(await screen.findByText("¡Hola, Ana!")).toBeTruthy();
    expect(await SecureStore.getItemAsync("ati_auth_token")).toBe("jwt-ok");
  });
});

describe("AuthContext", () => {
  test("al abrir la app restaura la sesión validando /auth/me con el token guardado", async () => {
    await SecureStore.setItemAsync("ati_auth_token", "jwt-guardado");
    const llamadas = apiFalsa({ "GET /auth/me": () => [200, usuarioComprador] });
    await renderConTema(
      <AuthProvider>
        <EstadoSesion />
      </AuthProvider>,
    );
    expect(await screen.findByText("sesión de Ana Gómez (comprador)")).toBeTruthy();
    expect(llamadas[0].config.headers.Authorization).toBe("Bearer jwt-guardado");
  });

  test("sin token guardado no llama al back", async () => {
    const llamadas = apiFalsa({});
    await renderConTema(
      <AuthProvider>
        <EstadoSesion />
      </AuthProvider>,
    );
    expect(await screen.findByText("sin sesión")).toBeTruthy();
    expect(llamadas).toHaveLength(0);
  });

  test("token vencido o inválido: cierra la sesión con un toast y borra el token", async () => {
    await SecureStore.setItemAsync("ati_auth_token", "jwt-vencido");
    apiFalsa({
      "GET /auth/me": () => [401, { status: "fail", message: "Token inválido o expirado" }],
    });
    await renderConTema(
      <AuthProvider>
        <EstadoSesion />
      </AuthProvider>,
    );
    expect(await screen.findByText("sin sesión")).toBeTruthy();
    expect(await screen.findByText("Sesión cerrada")).toBeTruthy();
    await waitFor(async () => expect(await SecureStore.getItemAsync("ati_auth_token")).toBeNull());
  });

  test("un 401 en cualquier pedido con sesión vuelve al estado sin sesión", async () => {
    await SecureStore.setItemAsync("ati_auth_token", "jwt-ok");
    apiFalsa({
      "GET /auth/me": () => [200, usuarioComprador],
      "GET /compras/mias": () => [401, { message: "Token inválido o expirado" }],
    });
    await renderConTema(
      <AuthProvider>
        <EstadoSesion />
      </AuthProvider>,
    );
    expect(await screen.findByText(/sesión de Ana/)).toBeTruthy();
    await expect(apiCaller.get("/compras/mias")).rejects.toThrow("Token inválido o expirado");
    expect(await screen.findByText("sin sesión")).toBeTruthy();
    expect(screen.getByText(/Tu sesión venció/)).toBeTruthy();
  });
});
