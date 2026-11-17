import { act, fireEvent, renderHook, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { AuthContext } from "../src/context/AuthContext";
import { NotificacionesProvider, useNotificaciones } from "../src/context/NotificacionesContext";
import { SocketContext } from "../src/context/SocketContext";
import { ThemeProvider } from "../src/context/ThemeContext";
import { ToastProvider } from "../src/context/ToastContext";
import { Chat } from "../src/features/compras/Chat";
import { Mensajes } from "../src/features/mensajes/Mensajes";
import { Notificaciones } from "../src/features/notificaciones/Notificaciones";
import { INTERVALO_POLLING_MS, useChatCompra } from "../src/hooks/useChatCompra";
import { conSeparadores, mensajesService, unirMensajes } from "../src/service/mensajesService";
import { notificacionesService } from "../src/service/notificacionesService";
import { apiFalsa } from "../pruebas/apiFalsa";
import { renderConTema } from "../pruebas/helpers";
import {
  compraDto,
  renderPantalla,
  sesionComprador,
  sesionOrganizador,
  socketFalso,
} from "../pruebas/pantallas";

const mensajeDto = (id, extra = {}) => ({
  id,
  usuarioId: "u2",
  usuarioNombre: "Lucía",
  rol: "ORGANIZADOR",
  mensaje: `Mensaje ${id}`,
  enviado: `2030-11-20T15:0${id.slice(-1)}:00.000Z`,
  ...extra,
});

/** Contextos para los hooks: sesión, tema, avisos, socket y notificaciones. */
function contextos({ socket = null, conectado = false, sesion = sesionComprador } = {}) {
  return function Envoltorio({ children }) {
    return (
      <ThemeProvider preferenciaInicial="claro">
        <ToastProvider>
          <AuthContext.Provider value={sesion}>
            <SocketContext.Provider value={{ socket, conectado }}>
              <NotificacionesProvider>{children}</NotificacionesProvider>
            </SocketContext.Provider>
          </AuthContext.Provider>
        </ToastProvider>
      </ThemeProvider>
    );
  };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe("mensajesService", () => {
  test("unirMensajes no repite por id y ordena por fecha", () => {
    const a = { id: "1", enviado: "2030-01-01T10:00:00Z" };
    const b = { id: "2", enviado: "2030-01-01T09:00:00Z" };
    expect(unirMensajes([a], [b, a, b]).map((m) => m.id)).toEqual(["2", "1"]);
  });

  test("separadores por día (Hoy / Ayer / fecha)", () => {
    const hoy = new Date(2030, 10, 20, 18);
    const filas = conSeparadores(
      [
        { id: "1", enviado: new Date(2030, 10, 19, 10).toISOString() },
        { id: "2", enviado: new Date(2030, 10, 20, 9).toISOString() },
        { id: "3", enviado: new Date(2030, 10, 20, 10).toISOString() },
      ],
      hoy,
    );
    expect(filas.filter((f) => f.tipo === "dia").map((f) => f.texto)).toEqual(["Ayer", "Hoy"]);
    expect(filas).toHaveLength(5);
  });
});

describe("useChatCompra", () => {
  test("carga el historial, se une a la sala y no repite mensajes del socket", async () => {
    const socket = socketFalso();
    jest
      .spyOn(mensajesService, "listar")
      .mockResolvedValue({ mensajes: [], noLeidos: 0 })
      .mockResolvedValueOnce({
        mensajes: [
          {
            id: "m1",
            texto: "Hola",
            propio: false,
            enviado: "2030-11-20T15:01:00.000Z",
            estado: "enviado",
          },
        ],
        noLeidos: 1,
      });
    const leidos = jest.spyOn(mensajesService, "marcarLeidos").mockResolvedValue({});
    const { result, unmount } = await renderHook(() => useChatCompra("c1"), {
      wrapper: contextos({ socket, conectado: true }),
    });
    await waitFor(() => expect(result.current.mensajes).toHaveLength(1));
    expect(socket.emit).toHaveBeenCalledWith("compra:unirse", { compraId: "c1" });
    expect(leidos).toHaveBeenCalledWith("c1");

    await act(async () => {
      socket.disparar("mensaje:nuevo", { compraId: "c1", mensaje: mensajeDto("m2") });
      socket.disparar("mensaje:nuevo", { compraId: "c1", mensaje: mensajeDto("m2") });
      socket.disparar("mensaje:nuevo", { compraId: "otra", mensaje: mensajeDto("m3") });
    });
    expect(result.current.mensajes.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(leidos).toHaveBeenCalledTimes(2);

    await unmount();
    expect(socket.emit).toHaveBeenCalledWith("compra:salir", { compraId: "c1" });
    expect(socket.escuchando("mensaje:nuevo")).toBe(false);
  });

  test("sin socket cae a polling cada 10 s con ?desde= el último mensaje", async () => {
    jest.useFakeTimers();
    const listar = jest
      .spyOn(mensajesService, "listar")
      .mockResolvedValueOnce({
        mensajes: [
          {
            id: "m1",
            texto: "Hola",
            propio: true,
            enviado: "2030-11-20T15:01:00.000Z",
            estado: "enviado",
          },
        ],
        noLeidos: 0,
      })
      .mockResolvedValue({
        mensajes: [
          {
            id: "m2",
            texto: "Respuesta",
            propio: false,
            enviado: "2030-11-20T15:02:00.000Z",
            estado: "enviado",
          },
        ],
        noLeidos: 1,
      });
    jest.spyOn(mensajesService, "marcarLeidos").mockResolvedValue({});
    const { result } = await renderHook(() => useChatCompra("c1"), {
      wrapper: contextos({ socket: null, conectado: false }),
    });
    await waitFor(() => expect(result.current.mensajes).toHaveLength(1));
    expect(result.current.conectado).toBe(false);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_POLLING_MS);
    });
    expect(listar).toHaveBeenLastCalledWith("c1", "u1", "2030-11-20T15:01:00.000Z");
    expect(result.current.mensajes.map((m) => m.id)).toEqual(["m1", "m2"]);

    // Otra vuelta trae el mismo mensaje: no se duplica.
    await act(async () => {
      await jest.advanceTimersByTimeAsync(INTERVALO_POLLING_MS);
    });
    expect(result.current.mensajes).toHaveLength(2);
  });

  test("enviar es optimista; si falla queda con error y reintentar lo manda", async () => {
    jest.spyOn(mensajesService, "listar").mockResolvedValue({ mensajes: [], noLeidos: 0 });
    jest.spyOn(mensajesService, "marcarLeidos").mockResolvedValue({});
    let resolver;
    const enviar = jest
      .spyOn(mensajesService, "enviar")
      .mockRejectedValueOnce(new Error("Sin conexión"))
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolver = r;
          }),
      );
    const { result } = await renderHook(() => useChatCompra("c1"), {
      wrapper: contextos({ socket: socketFalso(), conectado: true }),
    });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.enviar("  ¿A qué hora abren?  ");
    });
    const [fallido] = result.current.mensajes;
    expect(fallido).toMatchObject({ texto: "¿A qué hora abren?", estado: "error", propio: true });

    await act(async () => {
      result.current.reintentar(fallido.id);
    });
    expect(result.current.mensajes).toEqual([
      expect.objectContaining({ texto: "¿A qué hora abren?", estado: "enviando" }),
    ]);
    await act(async () => {
      resolver({
        id: "real",
        texto: "¿A qué hora abren?",
        propio: true,
        enviado: "2030-11-20T15:05:00.000Z",
        estado: "enviado",
      });
    });
    expect(result.current.mensajes).toEqual([
      expect.objectContaining({ id: "real", estado: "enviado" }),
    ]);
    expect(enviar).toHaveBeenCalledTimes(2);
    expect(enviar).toHaveBeenLastCalledWith("c1", "¿A qué hora abren?", "u1");
  });

  test("al reconectar pide los mensajes que llegaron mientras el socket estaba caído", async () => {
    const socket = socketFalso();
    const listar = jest
      .spyOn(mensajesService, "listar")
      .mockResolvedValueOnce({
        mensajes: [
          {
            id: "m1",
            texto: "Hola",
            propio: true,
            enviado: "2030-11-20T15:01:00.000Z",
            estado: "enviado",
          },
        ],
        noLeidos: 0,
      })
      .mockResolvedValue({ mensajes: [], noLeidos: 0 });
    jest.spyOn(mensajesService, "marcarLeidos").mockResolvedValue({});
    let conectado = false;
    const { result, rerender } = await renderHook(() => useChatCompra("c1"), {
      wrapper: ({ children }) => contextos({ socket, conectado })({ children }),
    });
    await waitFor(() => expect(result.current.mensajes).toHaveLength(1));
    conectado = true;
    await rerender({});
    await waitFor(() =>
      expect(listar).toHaveBeenCalledWith("c1", "u1", "2030-11-20T15:01:00.000Z"),
    );
  });
});

describe("NotificacionesContext", () => {
  function Contador() {
    const { noLeidas, marcarTodas } = useNotificaciones();
    return (
      <Text testID="contador" onPress={() => marcarTodas()}>
        {String(noLeidas)}
      </Text>
    );
  }

  test("carga la cantidad, suma al recibir (con toast) y resetea al marcar todas", async () => {
    jest.spyOn(notificacionesService, "cantidadNoLeidas").mockResolvedValue(2);
    jest.spyOn(mensajesService, "totalNoLeidos").mockResolvedValue(0);
    const marcar = jest.spyOn(notificacionesService, "marcarTodas").mockResolvedValue(2);
    const socket = socketFalso();
    const Envoltorio = contextos({ socket, conectado: true });
    await renderConTema(
      <Envoltorio>
        <Contador />
      </Envoltorio>,
    );
    await waitFor(() => expect(screen.getByTestId("contador")).toHaveTextContent("2"));

    await act(async () => {
      socket.disparar("notificacion:nueva", {
        id: "n1",
        tipo: "COMPRA_CONFIRMADA",
        titulo: "Compra confirmada",
        mensaje: "Ana pagó 2 entradas",
        datos: { compraId: "c1" },
      });
    });
    expect(screen.getByTestId("contador")).toHaveTextContent("3");
    expect(screen.getByText("Ana pagó 2 entradas")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("contador"));
    await waitFor(() => expect(screen.getByTestId("contador")).toHaveTextContent("0"));
    expect(marcar).toHaveBeenCalled();
  });

  test("no muestra el toast de un mensaje del chat que está abierto", async () => {
    jest.spyOn(notificacionesService, "cantidadNoLeidas").mockResolvedValue(0);
    jest.spyOn(mensajesService, "totalNoLeidos").mockResolvedValue(0);
    jest.spyOn(mensajesService, "listar").mockResolvedValue({ mensajes: [], noLeidos: 0 });
    jest.spyOn(mensajesService, "marcarLeidos").mockResolvedValue({});
    const socket = socketFalso();
    const { result } = await renderHook(
      () => ({ chat: useChatCompra("c1"), notificaciones: useNotificaciones() }),
      { wrapper: contextos({ socket, conectado: true }) },
    );
    await waitFor(() => expect(result.current.chat.cargando).toBe(false));
    await act(async () => {
      socket.disparar("notificacion:nueva", {
        id: "n2",
        tipo: "NUEVO_MENSAJE",
        titulo: "Nuevo mensaje",
        mensaje: "Lucía te escribió",
        datos: { compraId: "c1" },
      });
    });
    expect(result.current.notificaciones.noLeidas).toBe(1);
    expect(screen.queryByText("Lucía te escribió")).toBeNull();
  });
});

describe("pantalla Chat", () => {
  const montar = () =>
    apiFalsa({
      "GET /compras/c1": () => [
        200,
        compraDto({
          estado: "CANCELADA",
          motivoCancelacion: "CANCELADA_POR_COMPRADOR",
          fechaLimitePago: null,
        }),
      ],
      "GET /compras/c1/mensajes": () => [
        200,
        { mensajes: [mensajeDto("m1")], mensajesNoLeidos: 1 },
      ],
      "POST /compras/c1/mensajes/leidos": () => [200, {}],
      "POST /compras/c1/mensajes": (config) => [
        201,
        mensajeDto("m9", {
          usuarioId: "u1",
          usuarioNombre: "Ana",
          rol: "COMPRADOR",
          mensaje: JSON.parse(config.data).mensaje,
        }),
      ],
    });

  test("enviar está deshabilitado con el campo vacío; con texto envía (también si la compra está CANCELADA)", async () => {
    const llamadas = montar();
    await renderPantalla(Chat, {
      params: { compraId: "c1" },
      socket: socketFalso(),
      conectado: true,
    });
    expect(await screen.findByText("Mensaje m1")).toBeTruthy();
    expect(await screen.findByText("Cancelada")).toBeTruthy();
    const boton = screen.getByTestId("chat-enviar");
    expect(boton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId("chat-input"), "   ");
    expect(screen.getByTestId("chat-enviar").props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(screen.getByTestId("chat-input"), "¿Cuándo me devuelven?");
    expect(screen.getByText("21/1000")).toBeTruthy();
    expect(screen.getByTestId("chat-enviar").props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId("chat-enviar"));
    expect(await screen.findByText("¿Cuándo me devuelven?")).toBeTruthy();
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "POST /compras/c1/mensajes")).toBe(true),
    );
    expect(screen.getByTestId("chat-input").props.value).toBe("");
  });

  test("sin socket avisa que busca mensajes cada 10 s; compra:estado actualiza el badge", async () => {
    montar();
    await renderPantalla(Chat, { params: { compraId: "c1" } });
    expect(await screen.findByTestId("aviso-polling")).toBeTruthy();

    const socket = socketFalso();
    await renderPantalla(Chat, { params: { compraId: "c1" }, socket, conectado: true });
    expect(await screen.findAllByText("Cancelada")).toBeTruthy();
    await act(async () => {
      socket.disparar("compra:estado", { compraId: "c1", estado: "REEMBOLSADA" });
    });
    expect(await screen.findByText("Reembolsada")).toBeTruthy();
  });
});

describe("Bandeja de mensajes", () => {
  test("lista las conversaciones con no leídos y abre el chat", async () => {
    apiFalsa({
      "GET /compras/conversaciones": () => [
        200,
        {
          items: [
            {
              compraId: "c1",
              estado: "CONFIRMADA",
              tipoEntrada: "General",
              cantidad: 2,
              evento: {
                id: "e1",
                nombre: "Noche de Jazz",
                fecha: "2030-12-05T23:00:00.000Z",
                imagen: null,
              },
              otro: { nombre: "Lucía", rol: "ORGANIZADOR" },
              ultimoMensaje: mensajeDto("m1", { mensaje: "Abrimos a las 20 h" }),
              mensajesNoLeidos: 3,
            },
          ],
          total: 1,
          pagina: 1,
          limite: 10,
          totalNoLeidos: 3,
        },
      ],
    });
    await renderPantalla(Mensajes);
    expect(await screen.findByText("Abrimos a las 20 h")).toBeTruthy();
    expect(screen.getByTestId("no-leidos-c1")).toHaveTextContent("3");
    expect(screen.getByText(/Lucía · Organizador · 2 × General/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId("conversacion-c1"));
    expect(await screen.findByText(/destino:ChatCompra:\{"compraId":"c1"\}/)).toBeTruthy();
  });

  test("sin conversaciones muestra el estado vacío según el rol", async () => {
    apiFalsa({
      "GET /compras/conversaciones": () => [
        200,
        { items: [], total: 0, pagina: 1, limite: 10, totalNoLeidos: 0 },
      ],
    });
    await renderPantalla(Mensajes, { sesion: sesionOrganizador });
    expect(await screen.findByText(/Cuando un comprador te escriba/)).toBeTruthy();
  });
});

describe("Centro de notificaciones", () => {
  const lista = {
    items: [
      {
        id: "n1",
        tipo: "COMPRA_CONFIRMADA",
        titulo: "Compra confirmada",
        mensaje: "Tus entradas están confirmadas",
        datos: { compraId: "c1", eventoId: "e1" },
        fecha: "2030-11-20T15:00:00.000Z",
        leida: false,
      },
      {
        id: "n2",
        tipo: "NUEVO_MENSAJE",
        titulo: "Nuevo mensaje",
        mensaje: "Lucía te escribió",
        datos: { compraId: "c2" },
        fecha: "2030-11-19T15:00:00.000Z",
        leida: true,
      },
    ],
    total: 2,
    pagina: 1,
    limite: 15,
  };

  test("tocar una la marca leída y navega a la compra; un mensaje abre el chat", async () => {
    const llamadas = apiFalsa({
      "GET /notificaciones": () => [200, lista],
      "GET /notificaciones/no-leidas/cantidad": () => [200, { cantidad: 1 }],
      "PATCH /notificaciones/n1/leida": () => [200, { ...lista.items[0], leida: true }],
    });
    await renderPantalla(Notificaciones);
    const noLeida = await screen.findByTestId("notificacion-n1");
    expect(noLeida.props.accessibilityLabel).toMatch(/^No leída\. Compra confirmada/);
    await fireEvent.press(noLeida);
    expect(await screen.findByText(/destino:DetalleCompra:\{"compraId":"c1"\}/)).toBeTruthy();
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "PATCH /notificaciones/n1/leida")).toBe(true),
    );
  });

  test("las de mensaje abren el chat y 'Marcar todas' llama a /leidas", async () => {
    const llamadas = apiFalsa({
      "GET /notificaciones": () => [200, lista],
      "GET /notificaciones/no-leidas/cantidad": () => [200, { cantidad: 1 }],
      "PATCH /notificaciones/leidas": () => [200, { actualizadas: 1 }],
    });
    await renderPantalla(Notificaciones);
    await screen.findByTestId("notificacion-n1");
    await waitFor(() =>
      expect(screen.getByTestId("marcar-todas").props.accessibilityState.disabled).toBe(false),
    );
    await fireEvent.press(screen.getByTestId("marcar-todas"));
    await waitFor(() =>
      expect(llamadas.some((l) => l.clave === "PATCH /notificaciones/leidas")).toBe(true),
    );
    expect(screen.getByTestId("notificacion-n1").props.accessibilityLabel).not.toMatch(/No leída/);
    await fireEvent.press(screen.getByTestId("notificacion-n2"));
    expect(await screen.findByText(/destino:ChatCompra:\{"compraId":"c2"\}/)).toBeTruthy();
  });

  test("vacía muestra el EmptyState", async () => {
    apiFalsa({
      "GET /notificaciones": () => [200, { items: [], total: 0, pagina: 1, limite: 15 }],
      "GET /notificaciones/no-leidas/cantidad": () => [200, { cantidad: 0 }],
    });
    await renderPantalla(Notificaciones);
    expect(await screen.findByText("No tenés notificaciones")).toBeTruthy();
  });
});
