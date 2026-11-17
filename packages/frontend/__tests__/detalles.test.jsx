import { useState } from "react";
import { AccessibilityInfo, Pressable, Text } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";
import { SearchX } from "lucide-react-native";
import { EmptyState, ListaEscalonada } from "../src/components/ui";
import { Explorar } from "../src/features/eventos/Explorar";
import { Mensajes } from "../src/features/mensajes/Mensajes";
import { MisEventos } from "../src/features/organizador/MisEventos";
import { aEvento } from "../src/service/eventosService";
import { agruparConversaciones } from "../src/service/mensajesService";
import { resumenOrganizador } from "../src/service/organizadorService";
import { chipFecha, faltanTexto } from "../src/utils/fechas";
import { iniciales } from "../src/utils/textos";
import { apiFalsa, usuarioOrganizador } from "../pruebas/apiFalsa";
import { renderConTema } from "../pruebas/helpers";
import { eventoDto, renderPantalla, sesionOrganizador } from "../pruebas/pantallas";

// Spec 07c: detalles de "Telón de terciopelo" en Explorar, Mensajes y Mis eventos.

const OCULTOS = { includeHiddenElements: false };
const TODOS = { includeHiddenElements: true };

function movimientoReducido(valor = true) {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(valor);
}

/** El elemento existe pero no está en el árbol de accesibilidad. */
function esDecorativo(testID) {
  expect(screen.queryAllByTestId(testID, TODOS).length).toBeGreaterThan(0);
  expect(screen.queryAllByTestId(testID, OCULTOS)).toHaveLength(0);
}

afterEach(() => jest.restoreAllMocks());

describe("helpers puros", () => {
  const ahora = new Date(2030, 10, 20, 15, 0); // 20/11/2030 15:00 (hora local)

  test.each([
    [new Date(2030, 10, 20, 21, 0), "Hoy"],
    [new Date(2030, 10, 21, 0, 30), "Mañana"],
    [new Date(2030, 10, 25, 21, 0), "Faltan 5 días"],
    [new Date(2030, 10, 20, 10, 0), null], // ya pasó
    [null, null],
  ])("faltanTexto(%p) → %p", (fecha, esperado) => {
    expect(faltanTexto(fecha?.toISOString() ?? null, ahora)).toBe(esperado);
  });

  test("chipFecha: día y mes en versalitas sin punto", () => {
    expect(chipFecha(new Date(2030, 10, 22, 21).toISOString())).toEqual({ dia: 22, mes: "NOV" });
    expect(chipFecha(null)).toBeNull();
  });

  test("iniciales vive en utils/textos", () => {
    expect(iniciales("Lucía Ferrari")).toBe("LF");
    expect(iniciales(null)).toBe("");
  });

  test("aEvento suma quedanPocas, día y mes", () => {
    const evento = aEvento(eventoDto()); // cupo 110, quedan 3
    expect(evento.quedanPocas).toBe(true);
    expect(evento).toMatchObject({ dia: expect.any(Number), mes: expect.any(String) });
    expect(aEvento(eventoDto({ agotado: true })).quedanPocas).toBe(false);
  });

  test("resumenOrganizador: vendidas y ocupación de los próximos; reembolsos de todos", () => {
    expect(resumenOrganizador([])).toEqual({ vendidas: 0, ocupacion: 0, reembolsos: 0 });
    const ev = (extra) => ({
      vendidasTotal: 10,
      cupoTotal: 20,
      reembolsos: { cantidad: 0 },
      cancelado: false,
      anterior: false,
      ...extra,
    });
    expect(
      resumenOrganizador([
        ev({}),
        ev({ vendidasTotal: 5, cupoTotal: 20 }),
        ev({ anterior: true, vendidasTotal: 99, cupoTotal: 100 }),
        ev({ cancelado: true, vendidasTotal: 50, reembolsos: { cantidad: 3 } }),
        ev({ cupoTotal: 0, vendidasTotal: 0, reembolsos: { cantidad: 1 } }),
      ]),
    ).toEqual({ vendidas: 15, ocupacion: 38, reembolsos: 4 });
  });

  test("agruparConversaciones: Hoy, Ayer, Esta semana y Antes, sin grupos vacíos", () => {
    const c = (id, fecha) => ({ compraId: id, enviado: fecha.toISOString() });
    const items = [
      c("a", new Date(2030, 10, 20, 9)),
      c("b", new Date(2030, 10, 19, 23, 59)),
      c("c", new Date(2030, 10, 14, 8)), // 6 días antes: esta semana
      c("d", new Date(2030, 10, 13, 8)), // 7 días antes: antes
      c("e", new Date(2030, 10, 20, 0, 1)),
    ];
    const grupos = agruparConversaciones(items, ahora);
    expect(grupos.map((g) => g.titulo)).toEqual(["Hoy", "Ayer", "Esta semana", "Antes"]);
    expect(grupos[0].items.map((i) => i.compraId)).toEqual(["a", "e"]);
    expect(agruparConversaciones([items[3]], ahora).map((g) => g.titulo)).toEqual(["Antes"]);
    expect(agruparConversaciones([], ahora)).toEqual([]);
  });
});

describe("ListaEscalonada y EmptyState", () => {
  const items = (n, desde = 0) =>
    Array.from({ length: n }, (_, i) => <Text key={`i${desde + i}`}>Ítem {desde + i}</Text>);

  test("con movimiento reducido muestra todo de entrada", async () => {
    await renderConTema(
      <ListaEscalonada reducido testID="lista">
        {items(3)}
      </ListaEscalonada>,
    );
    for (const i of [0, 1, 2])
      expect(screen.getByTestId(`lista-item-${i}`)).toHaveStyle({ opacity: 1 });
  });

  test("anima solo los primeros 6 y no vuelve a animar lo que llega después", async () => {
    function ConPaginas() {
      const [pagina, setPagina] = useState(1);
      return (
        <>
          <Pressable onPress={() => setPagina(2)}>
            <Text>Siguiente</Text>
          </Pressable>
          <ListaEscalonada reducido={false} testID="lista">
            {pagina === 1 ? items(8) : items(3, 100)}
          </ListaEscalonada>
        </>
      );
    }
    await renderConTema(<ConPaginas />);
    expect(screen.getByTestId("lista-item-0")).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId("lista-item-5")).toHaveStyle({ opacity: 0 });
    expect(screen.getByTestId("lista-item-6")).toHaveStyle({ opacity: 1 });
    expect(screen.getByTestId("lista-item-7")).toHaveStyle({ opacity: 1 });

    // Otra página: ítems nuevos, se muestran directo.
    await fireEvent.press(screen.getByText("Siguiente"));
    expect(screen.getByText("Ítem 100")).toBeTruthy();
    for (const i of [0, 1, 2])
      expect(screen.getByTestId(`lista-item-${i}`)).toHaveStyle({ opacity: 1 });
  });

  test("EmptyState: telón cerrado y ornamento fuera del lector; el título sigue siendo header", async () => {
    await renderConTema(<EmptyState icono={SearchX} titulo="Nada por acá" mensaje="Probá otra" />);
    esDecorativo("escena-vacia");
    esDecorativo("telon-cerrado");
    esDecorativo("ornamento");
    expect(screen.getByRole("header", { name: "Nada por acá" })).toBeTruthy();
  });
});

describe("Explorar (07c)", () => {
  function montarApi() {
    apiFalsa({
      "GET /categorias": () => [200, [{ id: "c1", nombre: "Recitales", descripcion: "" }]],
      "GET /eventos/recomendados": () => [
        200,
        {
          items: [eventoDto({ id: "r1", nombre: "Rock Nacional" })],
          total: 1,
          pagina: 1,
          limite: 8,
          categorias: [],
          motivo: "Porque guardaste Recitales",
          sinFavoritos: false,
        },
      ],
      "GET /eventos": (config) => [
        200,
        {
          items: [
            eventoDto(), // quedan 3 de 110
            eventoDto({ id: "e2", nombre: "Ya pasó", yaOcurrio: true }),
            eventoDto({ id: "e3", nombre: "Sin lugar", agotado: true }),
            eventoDto({
              id: "e4",
              nombre: "Tranqui",
              tiposEntrada: [{ ...eventoDto().tiposEntrada[0], disponibles: 80 }],
            }),
          ],
          total: 4,
          pagina: config.params.pagina,
          limite: config.params.limite,
          filtrosAplicados: {},
        },
      ],
    });
  }

  test("'Últimas entradas' solo con pocas entradas, en el label y nunca en anteriores ni agotados", async () => {
    movimientoReducido();
    montarApi();
    await renderPantalla(Explorar);
    expect(await screen.findByText("Tranqui")).toBeTruthy();
    const badges = screen.getAllByText("Últimas entradas");
    // e1 en la lista y r1 en el carrusel de recomendados.
    expect(badges).toHaveLength(2);
    expect(screen.getByTestId("tarjeta-evento-e1").props.accessibilityLabel).toMatch(
      /Últimas entradas$/,
    );
    for (const id of ["e2", "e3", "e4"]) {
      expect(screen.getByTestId(`tarjeta-evento-${id}`).props.accessibilityLabel).not.toMatch(
        /Últimas entradas/,
      );
    }
  });

  test("contador en marquesina (sigue siendo header con live region) y decorativos ocultos", async () => {
    movimientoReducido();
    montarApi();
    await renderPantalla(Explorar);
    const contador = await screen.findByTestId("cantidad-resultados");
    expect(contador).toHaveTextContent("4 eventos");
    expect(contador.props.accessibilityLiveRegion).toBe("polite");
    expect(screen.getByRole("header", { name: "4 eventos" })).toBeTruthy();
    esDecorativo("chip-fecha-e1");
    esDecorativo("sello-r1");
    esDecorativo("reflector");
    esDecorativo("ornamento");
    expect(screen.queryByText("Para vos", OCULTOS)).toBeNull();
  });
});

describe("Mensajes (07c)", () => {
  const hace = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
  const conversacion = (id, enviado, noLeidos, extra = {}) => ({
    compraId: id,
    estado: "CONFIRMADA",
    tipoEntrada: "General",
    cantidad: 1,
    evento: { id: "e1", nombre: `Evento ${id}`, fecha: "2030-12-05T23:00:00.000Z", imagen: null },
    otro: { nombre: "Lucía Ferrari", rol: "ORGANIZADOR" },
    ultimoMensaje: {
      id: `m-${id}`,
      usuarioId: "u2",
      usuarioNombre: "Lucía",
      rol: "ORGANIZADOR",
      mensaje: `Hola ${id}`,
      enviado,
    },
    mensajesNoLeidos: noLeidos,
    ...extra,
  });

  test("agrupa por fecha, muestra 'N sin leer' y oculta cinta y avatar al lector", async () => {
    movimientoReducido();
    apiFalsa({
      "GET /compras/conversaciones": () => [
        200,
        {
          items: [
            conversacion("c1", new Date().toISOString(), 3),
            conversacion("c2", hace(10), 1),
            conversacion("c3", hace(12), 0),
          ],
          total: 3,
          pagina: 1,
          limite: 10,
        },
      ],
    });
    await renderPantalla(Mensajes);
    expect(await screen.findByText("Hola c1")).toBeTruthy();
    expect(screen.getByRole("header", { name: "Hoy" })).toBeTruthy();
    expect(screen.getByRole("header", { name: "Antes" })).toBeTruthy();
    expect(screen.queryByRole("header", { name: "Ayer" })).toBeNull();
    expect(screen.getByLabelText("4 sin leer")).toHaveTextContent("4 sin leer");
    esDecorativo("cinta-c1");
    esDecorativo("avatar-c1");
    expect(screen.queryByTestId("cinta-c3", TODOS)).toBeNull();
    expect(screen.getAllByText("LF", TODOS)).toHaveLength(3);
  });

  test("sin mensajes sin leer no muestra el contador", async () => {
    movimientoReducido();
    apiFalsa({
      "GET /compras/conversaciones": () => [
        200,
        { items: [conversacion("c1", hace(0), 0)], total: 1, pagina: 1, limite: 10 },
      ],
    });
    await renderPantalla(Mensajes);
    expect(await screen.findByText("Hola c1")).toBeTruthy();
    expect(screen.queryByTestId("sin-leer")).toBeNull();
  });
});

describe("Mis eventos (07c)", () => {
  const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString();

  function montarApi() {
    const tipo = eventoDto().tiposEntrada[0];
    apiFalsa({
      "GET /auth/me": () => [200, usuarioOrganizador],
      "GET /eventos/mios": () => [
        200,
        [
          // 107 de 110 vendidas: últimas entradas.
          eventoDto({
            fecha: enDias(5),
            comprasPorEstado: { CONFIRMADA: 3 },
            reembolsosPendientes: { cantidad: 2, proximoVencimiento: enDias(1) },
          }),
          eventoDto({
            id: "e2",
            nombre: "Lleno total",
            fecha: enDias(20),
            agotado: true,
            tiposEntrada: [{ ...tipo, cupo: 50, vendidas: 50, disponibles: 0, agotado: true }],
            comprasPorEstado: { CONFIRMADA: 50 },
          }),
          eventoDto({
            id: "e3",
            nombre: "Suspendido",
            cancelado: true,
            cancelacion: { motivo: "Lluvia", fecha: enDias(-1) },
            comprasPorEstado: {},
          }),
        ],
      ],
    });
  }

  test("resumen con valores finales y labels; estados de la tarjeta en el label", async () => {
    movimientoReducido();
    montarApi();
    await renderPantalla(MisEventos, { sesion: sesionOrganizador });
    expect(await screen.findByLabelText("157 Entradas vendidas")).toHaveTextContent(
      /157Entradas vendidas/,
    );
    expect(screen.getByLabelText("98 % Ocupación promedio")).toBeTruthy();
    expect(screen.getByLabelText("2 Reembolsos pendientes")).toBeTruthy();

    const e1 = screen.getByTestId("evento-org-e1").props.accessibilityLabel;
    expect(e1).toMatch(/Faltan 5 días\./);
    expect(e1).toMatch(/Últimas entradas\./);
    expect(screen.getByTestId("evento-org-e2").props.accessibilityLabel).toMatch(/Sala llena\./);
    esDecorativo("sello-sala-llena-e2");
    esDecorativo("chip-fecha-e1");

    const barras = screen.getAllByRole("progressbar");
    expect(barras[0]).toHaveAccessibilityValue({ min: 0, max: 110, now: 107 });
  });

  test("cancelados: sello decorativo y el estado en el label", async () => {
    movimientoReducido();
    montarApi();
    await renderPantalla(MisEventos, { sesion: sesionOrganizador });
    await screen.findByTestId("evento-org-e1");
    await fireEvent.press(screen.getByRole("tab", { name: /Cancelados/ }));
    const tarjeta = await screen.findByTestId("evento-org-e3");
    expect(tarjeta.props.accessibilityLabel).toMatch(/^Cancelado\./);
    expect(tarjeta.props.accessibilityLabel).not.toMatch(/Faltan|Sala llena/);
    esDecorativo("sello-cancelado-e3");
  });
});
