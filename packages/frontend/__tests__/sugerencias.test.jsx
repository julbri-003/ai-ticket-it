import { Linking } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import * as Location from "expo-location";
import { Chat } from "../src/features/compras/Chat";
import { DetalleEvento } from "../src/features/eventos/DetalleEvento";
import { CrearEvento } from "../src/features/organizador/CrearEvento";
import { EditarEvento } from "../src/features/organizador/EditarEvento";
import { aNotificacion } from "../src/service/notificacionesService";
import { ubicacionParaEnviar, validarDatosEvento } from "../src/service/organizadorService";
import {
  agregarIdea,
  ejemploNombre,
  ideaUsada,
  ideasDescripcion,
  sugerenciasChat,
  tiposSugeridos,
} from "../src/service/sugerenciasService";
import { urlComoLlegar } from "../src/utils/mapas";
import { apiFalsa } from "../pruebas/apiFalsa";
import {
  compraDto,
  eventoDto,
  renderPantalla,
  sesionOrganizador,
  socketFalso,
} from "../pruebas/pantallas";

// Spec 11: mensajes sugeridos, ideas al crear eventos, ubicación en el mapa y recordatorio de pago.

const UBICACION = { lat: -34.6213, lng: -58.3731, direccion: "Defensa 1200, San Telmo, CABA" };

afterEach(() => jest.restoreAllMocks());

describe("sugerenciasChat", () => {
  const compra = (extra = {}) => ({
    estado: "PENDIENTE",
    fechaLimitePagoTexto: "22/11 12:00",
    compradorNombre: "Ana Gómez",
    evento: { nombre: "Noche de Jazz", lugar: "Club Sur", ubicacion: UBICACION },
    ...extra,
  });

  test("comprador: preguntas frecuentes; sin ubicación pide la dirección", () => {
    const con = sugerenciasChat({ rol: "COMPRADOR", compra: compra() });
    expect(con).toHaveLength(6);
    expect(con[0]).toBe("¡Hola! ¿Hay código de vestimenta?");
    expect(con).toContain("¿Hay estacionamiento cerca?");
    const sin = sugerenciasChat({
      rol: "COMPRADOR",
      compra: compra({ evento: { nombre: "X", lugar: "Y", ubicacion: null } }),
    });
    expect(sin).toContain("¿Me pasás la dirección exacta?");
    expect(sin).not.toContain("¿Hay estacionamiento cerca?");
  });

  test.each([
    ["PENDIENTE", "Te recuerdo que tenés hasta el 22/11 12:00 para pagar tu reserva."],
    ["CONFIRMADA", "¡Tu pago quedó confirmado! Nos vemos en Club Sur."],
    ["CANCELADA", "Lamentamos que no puedas venir. Si necesitás algo, avisame."],
  ])("organizador con compra %s", (estado, esperado) => {
    const lista = sugerenciasChat({ rol: "ORGANIZADOR", compra: compra({ estado }) });
    expect(lista[0]).toBe(
      "¡Gracias por tu compra para Noche de Jazz! Te recomiendo llegar temprano.",
    );
    expect(lista[1]).toBe("¡Hola Ana! Cualquier duda sobre el evento, escribime por acá.");
    expect(lista).toContain(esperado);
  });

  test("con datos faltantes no aparece 'undefined' ni 'null'", () => {
    const lista = sugerenciasChat({
      rol: "ORGANIZADOR",
      compra: { estado: "PENDIENTE", evento: {}, compradorNombre: null },
    });
    expect(lista).toEqual(["Las puertas abren una hora antes del inicio."]);
    expect(sugerenciasChat()).toHaveLength(6);
  });
});

describe("ideas para crear eventos", () => {
  test("ejemplo de nombre e ideas según la categoría (sin acentos ni mayúsculas)", () => {
    expect(ejemploNombre("TEATRO")).toMatch(/carroza/);
    expect(ejemploNombre("Ópera")).toBe("Ej.: Noche de jazz en vivo");
    expect(ejemploNombre(undefined)).toBe("Ej.: Noche de jazz en vivo");
    expect(ideasDescripcion("Teatro").slice(0, 2)).toEqual(["Elenco", "Dirección"]);
    expect(ideasDescripcion("Ópera")[0]).toBe("Duración aproximada");
    expect(ideasDescripcion("Stand-up")).toContain("Contenido para adultos");
  });

  test("agregarIdea suma una línea, no duplica y respeta el máximo", () => {
    const primera = agregarIdea("Jazz en vivo.  ", "Duración aproximada");
    expect(primera).toEqual({
      descripcion: "Jazz en vivo.\nDuración aproximada: ",
      agregada: true,
    });
    expect(agregarIdea("", "Elenco").descripcion).toBe("Elenco: ");
    const repetida = agregarIdea("Algo\nduración aproximada: 2 h", "Duración aproximada");
    expect(repetida).toMatchObject({ agregada: false, motivo: "usada" });
    expect(ideaUsada("Algo\n  Elenco: Juan", "Elenco")).toBe(true);
    expect(agregarIdea("x".repeat(10), "Elenco", 12)).toMatchObject({
      agregada: false,
      motivo: "maximo",
      descripcion: "x".repeat(10),
    });
  });

  test("tipos sugeridos por categoría, sin repetir", () => {
    expect(tiposSugeridos("Recitales")).toEqual(["General", "VIP", "Preventa", "Campo", "Platea"]);
    expect(tiposSugeridos("Conferencias")).toContain("Estudiantes");
    expect(tiposSugeridos(null)).toEqual(["General", "VIP", "Preventa"]);
  });
});

describe("ubicación y Cómo llegar", () => {
  test("urlComoLlegar: coordenadas exactas, o el lugar codificado", () => {
    expect(urlComoLlegar({ ubicacion: UBICACION, lugar: "Club Sur" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-34.6213,-58.3731&travelmode=driving",
    );
    expect(urlComoLlegar({ ubicacion: null, lugar: "Club Sur, CABA" })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Club%20Sur%2C%20CABA&travelmode=driving",
    );
    expect(urlComoLlegar({ lugar: "  " })).toBeNull();
  });

  test("ubicacionParaEnviar y validación de la dirección", () => {
    expect(ubicacionParaEnviar({ lat: null, lng: null, direccion: "Calle 1" })).toBeNull();
    expect(ubicacionParaEnviar({ lat: 1, lng: 2, direccion: "" }, "Club Sur")).toEqual({
      lat: 1,
      lng: 2,
      direccion: "Club Sur",
    });
    const errores = validarDatosEvento({
      nombre: "X",
      categoriaId: "c1",
      fecha: new Date(Date.now() + 86400000),
      lugar: "Bar",
      descripcion: "D",
      ubicacion: { lat: 1, lng: 2, direccion: "" },
    });
    expect(errores.ubicacion).toMatch(/dirección exacta/);
  });

  test("RECORDATORIO_PAGO lleva al detalle de la compra", () => {
    const n = aNotificacion({
      id: "n1",
      tipo: "RECORDATORIO_PAGO",
      titulo: "Tu reserva vence pronto",
      mensaje: "Te quedan menos de 24 h",
      leida: false,
      fecha: "2030-11-21T15:00:00.000Z",
      datos: { compraId: "c1", eventoId: "e1" },
    });
    expect(n.destino).toEqual({ pantalla: "DetalleCompra", params: { compraId: "c1" } });
  });
});

describe("Chat: mensajes sugeridos", () => {
  const mensaje = (id, extra = {}) => ({
    id,
    usuarioId: "u2",
    usuarioNombre: "Lucía",
    rol: "ORGANIZADOR",
    mensaje: `Mensaje ${id}`,
    enviado: "2030-11-20T15:00:00.000Z",
    ...extra,
  });

  function montar({ mensajes = [], compra = compraDto() } = {}) {
    return apiFalsa({
      "GET /compras/c1": () => [200, compra],
      "GET /compras/c1/mensajes": () => [200, { mensajes, mensajesNoLeidos: 0 }],
      "POST /compras/c1/mensajes/leidos": () => [200, {}],
      "POST /compras/c1/mensajes": (config) => [
        201,
        mensaje("m9", {
          usuarioId: "u1",
          usuarioNombre: "Ana",
          rol: "COMPRADOR",
          mensaje: JSON.parse(config.data).mensaje,
        }),
      ],
    });
  }

  const abrir = (opciones) =>
    renderPantalla(Chat, {
      params: { compraId: "c1" },
      socket: socketFalso(),
      conectado: true,
      ...opciones,
    });

  test("el comprador ve preguntas frecuentes; tocar una completa el campo y no envía", async () => {
    const llamadas = montar();
    await abrir();
    const chip = await screen.findByRole("button", {
      name: "Usar sugerencia: ¡Hola! ¿Hay código de vestimenta?",
    });
    expect(screen.getByText(/Empezá con un mensaje sugerido/)).toBeTruthy();
    await fireEvent.press(chip);
    expect(screen.getByTestId("chat-input").props.value).toBe("¡Hola! ¿Hay código de vestimenta?");
    expect(llamadas.some((l) => l.clave === "POST /compras/c1/mensajes")).toBe(false);

    await fireEvent.press(screen.getByTestId("chat-enviar"));
    await waitFor(() => expect(screen.queryByTestId("sugerencias-chat")).toBeNull());
    expect(llamadas.some((l) => l.clave === "POST /compras/c1/mensajes")).toBe(true);
  });

  test("el organizador ve respuestas con el nombre del comprador y puede ocultarlas", async () => {
    montar({ compra: compraDto({ organizadorId: "u2" }) });
    await abrir({ sesion: sesionOrganizador });
    expect(
      await screen.findByRole("button", {
        name: "Usar sugerencia: ¡Hola Ana! Cualquier duda sobre el evento, escribime por acá.",
      }),
    ).toBeTruthy();
    await fireEvent.press(screen.getByRole("button", { name: "Ocultar sugerencias" }));
    expect(screen.queryByTestId("sugerencias-chat")).toBeNull();
  });

  test("si ya escribió en esa conversación no aparecen", async () => {
    montar({ mensajes: [mensaje("m1", { usuarioId: "u1", rol: "COMPRADOR" })] });
    await abrir();
    expect(await screen.findByText("Mensaje m1")).toBeTruthy();
    expect(screen.queryByTestId("sugerencias-chat")).toBeNull();
  });
});

describe("CrearEvento: ideas, tipos sugeridos y ubicación", () => {
  const montar = () =>
    apiFalsa({
      "GET /categorias": () => [200, [{ id: "c1", nombre: "Recitales" }]],
      "POST /eventos": (config) => [
        201,
        eventoDto({
          ...JSON.parse(config.data),
          id: "e9",
          categoria: { id: "c1", nombre: "Recitales" },
        }),
      ],
    });

  test("idea de descripción, tipo sugerido y evento creado con la ubicación buscada", async () => {
    Location.geocodeAsync.mockResolvedValueOnce([{ latitude: -34.62, longitude: -58.37 }]);
    const llamadas = montar();
    await renderPantalla(CrearEvento, { sesion: sesionOrganizador });

    await fireEvent.changeText(screen.getByTestId("evento-nombre"), "Noche de Jazz");
    await fireEvent.press(await screen.findByRole("button", { name: /Categoría/ }));
    await fireEvent.press(await screen.findByText("Recitales"));
    expect(screen.getByTestId("evento-nombre").props.placeholder).toMatch(/rock/);
    await fireEvent.press(screen.getByTestId("campo-fecha"));
    await fireEvent(
      screen.getByTestId("selector-fecha-hora"),
      "change",
      { type: "set" },
      new Date(2031, 0, 10),
    );
    await fireEvent.changeText(screen.getByTestId("evento-lugar"), "Club Sur");
    await fireEvent.changeText(screen.getByTestId("evento-descripcion"), "Jazz en vivo");

    await fireEvent.press(screen.getByTestId("idea-Banda soporte"));
    expect(screen.getByTestId("evento-descripcion").props.value).toBe(
      "Jazz en vivo\nBanda soporte: ",
    );
    expect(screen.getByTestId("idea-Banda soporte").props.accessibilityState.selected).toBe(true);

    await fireEvent.changeText(screen.getByTestId("ubicacion-direccion"), "Defensa 1200, CABA");
    await fireEvent.press(screen.getByTestId("ubicacion-buscar"));
    expect(await screen.findByText(/revisá que el pin quede/)).toBeTruthy();
    expect(Location.geocodeAsync).toHaveBeenCalledWith("Defensa 1200, CABA");
    expect(screen.getByTestId("pin-evento")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    await fireEvent.press(screen.getByTestId("tipo-sugerido-Campo"));
    expect(screen.getByTestId("tipo-0-nombre").props.value).toBe("Campo");
    expect(screen.queryByTestId("tipo-sugerido-Campo")).toBeNull();
    await fireEvent.changeText(screen.getByTestId("tipo-0-precio"), "18000");
    await fireEvent.changeText(screen.getByTestId("tipo-0-cupo"), "100");
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    await fireEvent.press(screen.getByTestId("paso-siguiente"));
    expect(screen.getByTestId("revision-direccion")).toHaveTextContent(
      "Dirección: Defensa 1200, CABA",
    );

    await fireEvent.press(screen.getByTestId("publicar"));
    await fireEvent.press(screen.getAllByRole("button", { name: "Publicar" }).at(-1));
    expect(await screen.findByText(/destino:MisEventos/)).toBeTruthy();
    const enviado = JSON.parse(llamadas.find((l) => l.clave === "POST /eventos").config.data);
    expect(enviado.ubicacion).toEqual({
      lat: -34.62,
      lng: -58.37,
      direccion: "Defensa 1200, CABA",
    });
    expect(enviado.descripcion).toBe("Jazz en vivo\nBanda soporte:");
  });

  test("sin resultados de la búsqueda avisa y no pone pin", async () => {
    montar();
    await renderPantalla(CrearEvento, { sesion: sesionOrganizador });
    await fireEvent.changeText(
      await screen.findByTestId("ubicacion-direccion"),
      "Calle inventada 1",
    );
    await fireEvent.press(screen.getByTestId("ubicacion-buscar"));
    expect(await screen.findByText(/No encontramos esa dirección/)).toBeTruthy();
    expect(screen.queryByTestId("pin-evento")).toBeNull();
  });
});

describe("DetalleEvento y EditarEvento: mapa y Cómo llegar", () => {
  const montar = (extra) =>
    apiFalsa({
      "GET /eventos/e1": () => [200, eventoDto(extra)],
      "GET /eventos/e1/resenias": () => [200, { items: [], total: 0, pagina: 1, limite: 5 }],
    });

  test("con ubicación: mapa decorativo, dirección como texto y ruta en auto a las coordenadas", async () => {
    const abrirUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    montar({ ubicacion: UBICACION });
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    expect(await screen.findByText(UBICACION.direccion)).toBeTruthy();
    expect(screen.queryByTestId("mapa-evento", { includeHiddenElements: false })).toBeNull();
    expect(screen.getByTestId("mapa-evento", { includeHiddenElements: true })).toBeTruthy();
    const boton = screen.getByRole("button", { name: "Cómo llegar" });
    expect(boton.props.accessibilityHint).toBe("Abre Google Maps con la ruta en auto");
    await fireEvent.press(boton);
    expect(abrirUrl).toHaveBeenCalledWith(
      "https://www.google.com/maps/dir/?api=1&destination=-34.6213,-58.3731&travelmode=driving",
    );
  });

  test("sin ubicación: sin mapa, y Cómo llegar usa el lugar", async () => {
    const abrirUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    montar();
    await renderPantalla(DetalleEvento, { params: { eventoId: "e1" } });
    await fireEvent.press(await screen.findByRole("button", { name: "Cómo llegar" }));
    expect(screen.queryByTestId("mapa-evento", { includeHiddenElements: true })).toBeNull();
    expect(abrirUrl).toHaveBeenCalledWith(expect.stringContaining("destination=Club%20Sur"));
  });

  test("Editar muestra la ubicación como no editable", async () => {
    montar({ ubicacion: UBICACION });
    await renderPantalla(EditarEvento, { params: { eventoId: "e1" }, sesion: sesionOrganizador });
    expect(
      await screen.findByLabelText(`Ubicación en el mapa: ${UBICACION.direccion}. No editable`),
    ).toBeTruthy();
  });
});
