import { fireEvent, screen } from "@testing-library/react-native";
import { AuthContext } from "../src/context/AuthContext";
import { NotificacionesProvider } from "../src/context/NotificacionesContext";
import { AppNavigator } from "../src/routes/AppNavigator";
import { apiFalsa, usuarioComprador, usuarioOrganizador } from "../pruebas/apiFalsa";
import { renderConTema } from "../pruebas/helpers";

const sesion = (usuario) => ({
  usuario: usuario ? { ...usuario, nombreCompleto: `${usuario.nombre} ${usuario.apellido}` } : null,
  token: usuario ? "jwt" : null,
  cargando: false,
  iniciarSesion: jest.fn(),
  registrarse: jest.fn(),
  cerrarSesion: jest.fn(),
  esComprador: usuario?.rol === "COMPRADOR",
  esOrganizador: usuario?.rol === "ORGANIZADOR",
});

function renderNavegador(valor) {
  return renderConTema(
    <AuthContext.Provider value={valor}>
      <NotificacionesProvider>
        <AppNavigator />
      </NotificacionesProvider>
    </AuthContext.Provider>,
  );
}

beforeEach(() => {
  apiFalsa({
    "GET /notificaciones/no-leidas/cantidad": () => [200, { cantidad: 3 }],
    "GET /compras/conversaciones": () => [
      200,
      { items: [], total: 0, pagina: 1, limite: 1, totalNoLeidos: 2 },
    ],
    "GET /resumen-publico": () => [
      200,
      {
        estadisticas: {
          eventosActivos: 13,
          entradasVendidas: 31,
          organizadores: 3,
          puntajePromedio: 4.5,
          cantidadResenias: 3,
        },
        reseniasDestacadas: [],
      },
    ],
    "GET /categorias": () => [
      200,
      [{ id: "c1", nombre: "Recitales", descripcion: "Música en vivo" }],
    ],
    "GET /eventos": () => [200, { items: [], total: 0, pagina: 1, limite: 8 }],
  });
});

describe("AppNavigator", () => {
  test("sin sesión muestra la Landing", async () => {
    await renderNavegador(sesion(null));
    expect(await screen.findByText("Explorá por categoría", { exact: false })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ingresar" })).toBeTruthy();
    expect(await screen.findByText("Recitales")).toBeTruthy();
  });

  test("el comprador ve sus tabs y el top bar con el contador de notificaciones", async () => {
    await renderNavegador(sesion(usuarioComprador));
    for (const tab of ["Explorar", "Mis compras", "Favoritos", "Mensajes", "Perfil"]) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Mis eventos")).toBeNull();
    expect(await screen.findByLabelText("Notificaciones, 3 sin leer")).toBeTruthy();
    // Top bar y tab de Mensajes.
    expect(await screen.findAllByLabelText("Mensajes, 2 sin leer")).toHaveLength(2);
  });

  test("el organizador ve sus tabs", async () => {
    await renderNavegador(sesion(usuarioOrganizador));
    for (const tab of ["Mis eventos", "Crear", "Mensajes", "Notificaciones", "Perfil"]) {
      expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("Mis compras")).toBeNull();
  });

  test("Perfil: cerrar sesión pide confirmación", async () => {
    const valor = sesion(usuarioComprador);
    await renderNavegador(valor);
    await fireEvent.press(screen.getAllByText("Perfil").at(-1));
    await fireEvent.press(await screen.findByRole("button", { name: "Cerrar sesión" }));
    expect(screen.getByText("¿Cerrar sesión?")).toBeTruthy();
    expect(valor.cerrarSesion).not.toHaveBeenCalled();
    const botones = screen.getAllByRole("button", { name: "Cerrar sesión" });
    await fireEvent.press(botones.at(-1));
    expect(valor.cerrarSesion).toHaveBeenCalledTimes(1);
  });
});
