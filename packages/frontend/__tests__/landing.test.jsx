import { AccessibilityInfo, ScrollView, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { act, fireEvent, renderHook, screen } from "@testing-library/react-native";
import { Clapperboard, Drama, Mic, Music } from "lucide-react-native";
import { iconoCategoria } from "../src/components/eventos/iconosCategoria";
import { Landing, textoCantidadEventos } from "../src/features/home/Landing";
import { iniciales } from "../src/utils/textos";
import { useContador, valorContador } from "../src/hooks/useContador";
import { quedanPocasEntradas } from "../src/service/publicoService";
import { apiFalsa } from "../pruebas/apiFalsa";
import { renderConTema } from "../pruebas/helpers";

const Stack = createNativeStackNavigator();
const OCULTOS = { includeHiddenElements: false };

const evento = (id, nombre, tipos, extra = {}) => ({
  id,
  nombre,
  fecha: "2026-11-22T21:00:00.000Z",
  lugar: "Estadio Obras",
  categoria: { id: "c1", nombre: "Recitales" },
  precioMinimo: 42000,
  imagen: null,
  tiposEntrada: tipos,
  agotado: tipos.every((t) => t.disponibles === 0),
  ...extra,
});

const EVENTOS = [
  evento("e1", "Divididos en vivo", [{ cupo: 100, disponibles: 5 }]),
  evento("e2", "Stand-up agotado", [{ cupo: 50, disponibles: 0 }]),
  evento("e3", "Jazz tranquilo", [{ cupo: 100, disponibles: 60 }]),
];

function montarApi() {
  apiFalsa({
    "GET /resumen-publico": () => [
      200,
      {
        estadisticas: {
          eventosActivos: 13,
          entradasVendidas: 1240,
          organizadores: 3,
          puntajePromedio: 4.5,
          cantidadResenias: 1,
        },
        eventosPorCategoria: { c1: 12, c2: 1 },
        reseniasDestacadas: [
          {
            id: "r1",
            compradorNombre: "Martín González",
            puntuacion: 5,
            detalle: "Impecable",
            evento: { nombre: "Noche de Jazz" },
          },
        ],
      },
    ],
    "GET /categorias": () => [
      200,
      [
        { id: "c1", nombre: "Recitales", descripcion: "Música en vivo" },
        { id: "c2", nombre: "Teatro", descripcion: "Obras" },
        { id: "c3", nombre: "Danza", descripcion: "Tango" },
      ],
    ],
    "GET /eventos": () => [200, { items: EVENTOS, total: 3, pagina: 1, limite: 8 }],
  });
}

const Destino = ({ route }) => <Text>Pantalla {route.name}</Text>;

async function renderLanding({ reducido = true } = {}) {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(reducido);
  montarApi();
  await renderConTema(
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Landing" component={Landing} />
        <Stack.Screen name="Login" component={Destino} />
        <Stack.Screen name="Registro" component={Destino} />
      </Stack.Navigator>
    </NavigationContainer>,
  );
  await screen.findByText("Divididos en vivo");
}

afterEach(() => jest.restoreAllMocks());

describe("helpers de la landing", () => {
  test.each([
    [null, null],
    [undefined, null],
    [0, "Próximamente"],
    [1, "1 evento"],
    [12, "12 eventos"],
  ])("textoCantidadEventos(%p) → %p", (n, esperado) => {
    expect(textoCantidadEventos(n)).toBe(esperado);
  });

  test.each([
    ["Martín G.", "MG"],
    ["ana", "A"],
    ["  Lucía  de la Fuente ", "LF"],
    ["", ""],
  ])("iniciales(%p) → %p", (nombre, esperado) => {
    expect(iniciales(nombre)).toBe(esperado);
  });

  test.each([
    [[{ cupo: 100, disponibles: 10 }], true], // exactamente 10 %
    [[{ cupo: 100, disponibles: 11 }], false],
    [[{ cupo: 100, disponibles: 0 }], false], // agotado: no es "últimas"
    [
      [
        { cupo: 50, disponibles: 0 },
        { cupo: 50, disponibles: 8 },
      ],
      true,
    ], // varios tipos: se suma el total
    [[], false],
  ])("quedanPocasEntradas(%j) → %p", (tipos, esperado) => {
    expect(quedanPocasEntradas(tipos)).toBe(esperado);
  });

  test("iconoCategoria: cada categoría del seed tiene ícono propio y una desconocida cae en Clapperboard", () => {
    expect(iconoCategoria("Recitales")).toBe(Music);
    expect(iconoCategoria("TEATRO")).toBe(Drama);
    expect(iconoCategoria("Stand-up")).toBe(Mic);
    const seed = [
      "Recitales",
      "Teatro",
      "Stand-up",
      "Festivales",
      "Deportes",
      "Conferencias",
      "Infantiles",
      "Danza",
    ];
    const iconos = seed.map(iconoCategoria);
    expect(new Set(iconos).size).toBe(seed.length);
    expect(iconos).not.toContain(Clapperboard);
    expect(iconoCategoria("Ópera")).toBe(Clapperboard);
  });
});

describe("useContador", () => {
  test("valorContador va de 0 al final, sin pasarse y con decimales", () => {
    expect(valorContador(1240, 0)).toBe(0);
    expect(valorContador(1240, 1)).toBe(1240);
    expect(valorContador(1240, 2)).toBe(1240);
    expect(valorContador(4.5, 0.5, 1)).toBeLessThan(4.5);
    const pasos = [0, 0.2, 0.4, 0.6, 0.8, 1].map((p) => valorContador(1000, p));
    expect(pasos).toEqual([...pasos].sort((a, b) => a - b));
    expect(valorContador(null, 0.5)).toBeNull();
  });

  test("con activo=false devuelve el valor final y con null no rompe", async () => {
    const { result } = await renderHook(() => useContador(1240, { activo: false }));
    expect(result.current).toBe(1240);
    const vacio = await renderHook(() => useContador(null));
    expect(vacio.result.current).toBeNull();
  });

  test("activo: arranca en 0 y termina en el valor final", async () => {
    jest.useFakeTimers();
    const { result } = await renderHook(() => useContador(1240, { duracion: 300 }));
    expect(result.current).toBeLessThan(1240);
    await act(async () => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(1240);
    jest.useRealTimers();
  });
});

describe("Landing (spec 07b)", () => {
  test("con movimiento reducido muestra los valores finales y el label accesible lleva el final", async () => {
    await renderLanding({ reducido: true });
    expect(await screen.findByText("1.240")).toBeTruthy();
    expect(screen.getByText("4,5 ★")).toBeTruthy();
    expect(screen.getByLabelText("1.240 Entradas vendidas")).toBeTruthy();
    expect(screen.getByLabelText("4,5 ★ Puntaje promedio")).toBeTruthy();
  });

  test("los adornos no están en el árbol de accesibilidad", async () => {
    await renderLanding();
    for (const id of ["telon", "reflector", "sello", "ornamento", "fleco", "chip-fecha-e1"]) {
      expect(screen.queryAllByTestId(id, { includeHiddenElements: true }).length).toBeGreaterThan(
        0,
      );
      expect(screen.queryAllByTestId(id, OCULTOS)).toHaveLength(0);
    }
    expect(screen.queryByText("“", OCULTOS)).toBeNull();
    expect(screen.queryByText("Estreno", OCULTOS)).toBeNull();
  });

  test("hero: perforación de puntos y garantías verdaderas", async () => {
    await renderLanding();
    expect(screen.getByTestId("perforacion-puntos", { includeHiddenElements: true })).toBeTruthy();
    for (const texto of [
      "Reembolso si se cancela el evento",
      "48 h para pagar tu reserva",
      "Chat directo con el organizador",
    ]) {
      expect(screen.getByLabelText(texto)).toBeTruthy();
    }
  });

  test("'Ver todos' lleva al Login", async () => {
    await renderLanding();
    await fireEvent.press(screen.getByRole("link", { name: "Ver todos los eventos" }));
    expect(await screen.findByText("Pantalla Login")).toBeTruthy();
  });

  test("categorías: ícono propio y cantidad de eventos (o Próximamente)", async () => {
    await renderLanding();
    expect(await screen.findByText("12 eventos")).toBeTruthy();
    expect(screen.getByText("1 evento")).toBeTruthy();
    expect(screen.getByText("Próximamente")).toBeTruthy();
    expect(screen.getByLabelText("Recitales. 12 eventos. Música en vivo")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("categoria-landing-c3"));
    expect(await screen.findByText("Pantalla Login")).toBeTruthy();
  });

  test("'Últimas entradas' solo con ≤ 10 % del cupo y nunca si está agotado", async () => {
    await renderLanding();
    expect(screen.getAllByText("Últimas entradas")).toHaveLength(1);
    expect(screen.getByLabelText(/Divididos en vivo.*Últimas entradas/)).toBeTruthy();
    expect(screen.queryByLabelText(/Stand-up agotado.*Últimas entradas/)).toBeNull();
  });

  test("reseñas con iniciales y pie de crítica", async () => {
    await renderLanding();
    expect(screen.getByText("Impecable")).toBeTruthy();
    expect(screen.getByText("MG", { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(/Martín González · Noche de Jazz/)).toBeTruthy();
  });

  test("footer: los links de Plataforma hacen scroll y los de Cuenta navegan", async () => {
    const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo").mockImplementation(() => {});
    await renderLanding();

    await act(async () => {
      fireEvent(screen.getByTestId("seccion-comoFunciona"), "layout", {
        nativeEvent: { layout: { x: 0, y: 900, width: 360, height: 400 } },
      });
    });
    await fireEvent.press(screen.getByRole("link", { name: "¿Cómo funciona?" }));
    expect(scrollTo).toHaveBeenCalledWith({ y: 828, animated: false });

    await fireEvent.press(screen.getByRole("link", { name: "Crear cuenta" }));
    expect(await screen.findByText("Pantalla Registro")).toBeTruthy();
  });

  test("sin movimiento reducido también renderiza (contadores y telón animados)", async () => {
    await renderLanding({ reducido: false });
    expect(screen.getByText("Divididos en vivo")).toBeTruthy();
    expect(screen.getByLabelText("13 Eventos activos")).toBeTruthy();
  });
});
