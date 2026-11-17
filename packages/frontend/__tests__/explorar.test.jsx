import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { Explorar } from "../src/features/eventos/Explorar";
import { CarruselRecomendados } from "../src/components/eventos/CarruselRecomendados";
import { apiFalsa } from "../pruebas/apiFalsa";
import { eventoDto, renderPantalla } from "../pruebas/pantallas";
import { renderConTema } from "../pruebas/helpers";

const RECOMENDADOS = {
  items: [eventoDto({ id: "r1", nombre: "Rock Nacional" })],
  total: 1,
  pagina: 1,
  limite: 8,
  categorias: [{ id: "c1", nombre: "Recitales", cantidad: 3 }],
  motivo: "Porque guardaste eventos de Recitales",
  sinFavoritos: false,
};

function montarApi({ recomendados = RECOMENDADOS } = {}) {
  return apiFalsa({
    "GET /categorias": () => [
      200,
      [
        { id: "c1", nombre: "Recitales", descripcion: "" },
        { id: "c2", nombre: "Teatro", descripcion: "" },
      ],
    ],
    "GET /eventos/recomendados": () => [200, recomendados],
    "GET /eventos": (config) => [
      200,
      {
        items: [eventoDto()],
        total: config.params.limite === 1 ? 7 : 1,
        pagina: config.params.pagina,
        limite: config.params.limite,
        filtrosAplicados: { paraVos: config.params.paraVos === "true" },
      },
    ],
  });
}

/** Parámetros del último GET /eventos (búsqueda, no el conteo del panel). */
const ultimaBusqueda = (llamadas) =>
  llamadas.filter((l) => l.clave === "GET /eventos" && l.config.params.limite === 10).at(-1).config
    .params;

describe("Explorar", () => {
  test("carga la cartelera con la query por defecto", async () => {
    const llamadas = montarApi();
    await renderPantalla(Explorar);
    expect(await screen.findByText("Noche de Jazz")).toBeTruthy();
    expect(ultimaBusqueda(llamadas)).toEqual({ pagina: 1, limite: 10, orden: "fecha" });
    expect(screen.getByTestId("cantidad-resultados")).toHaveTextContent("1 evento");
  });

  test("elegir categorías y Para vos cambia la query; quitar una pill la actualiza", async () => {
    const llamadas = montarApi();
    await renderPantalla(Explorar);
    await screen.findByText("Noche de Jazz");

    await fireEvent.press(screen.getAllByRole("button", { name: "Teatro" })[0]);
    await waitFor(() => expect(ultimaBusqueda(llamadas).categoriaIds).toBe("c2"));

    await waitFor(() =>
      expect(screen.getByTestId("pill-para-vos").props.accessibilityState.disabled).toBe(false),
    );
    await fireEvent.press(screen.getByTestId("pill-para-vos"));
    await waitFor(() =>
      expect(ultimaBusqueda(llamadas)).toMatchObject({ paraVos: "true", categoriaIds: "c2" }),
    );
    expect(await screen.findByText("1 evento para vos")).toBeTruthy();

    await fireEvent.press(screen.getByTestId("pill-categoria:c2"));
    await waitFor(() => expect(ultimaBusqueda(llamadas).categoriaIds).toBeUndefined());
    expect(ultimaBusqueda(llamadas).paraVos).toBe("true");
  });

  test("el panel de filtros aplica orden y rango, con conteo en vivo", async () => {
    const llamadas = montarApi();
    await renderPantalla(Explorar);
    await screen.findByText("Noche de Jazz");

    await fireEvent.press(screen.getByTestId("boton-filtros"));
    await fireEvent.press(screen.getByRole("button", { name: "Precio" }));
    await fireEvent.press(screen.getByRole("button", { name: "Descendente ↓" }));
    await fireEvent.changeText(screen.getByTestId("filtro-precio-min"), "1000");
    expect(await screen.findByText("Aplicar (7 resultados)")).toBeTruthy();
    await fireEvent.press(screen.getByTestId("aplicar-filtros"));

    await waitFor(() =>
      expect(ultimaBusqueda(llamadas)).toMatchObject({
        orden: "precio",
        direccion: "desc",
        precioMin: 1000,
        pagina: 1,
      }),
    );
    expect(screen.getByLabelText("Filtros, 2 activos")).toBeTruthy();
  });

  test("un rango inválido deshabilita Aplicar y muestra el error junto al campo", async () => {
    montarApi();
    await renderPantalla(Explorar);
    await screen.findByText("Noche de Jazz");
    await fireEvent.press(screen.getByTestId("boton-filtros"));
    await fireEvent.changeText(screen.getByTestId("filtro-precio-min"), "500");
    await fireEvent.changeText(screen.getByTestId("filtro-precio-max"), "100");
    expect(screen.getByText("El máximo tiene que ser mayor o igual al mínimo.")).toBeTruthy();
    expect(screen.getByTestId("aplicar-filtros").props.accessibilityState.disabled).toBe(true);
  });
});

describe("CarruselRecomendados", () => {
  test("muestra el motivo y los eventos recomendados", async () => {
    montarApi();
    await renderConTema(<CarruselRecomendados onVerTodos={jest.fn()} onAbrirEvento={jest.fn()} />);
    expect(await screen.findByText("Porque guardaste eventos de Recitales")).toBeTruthy();
    expect(screen.getByText("Rock Nacional")).toBeTruthy();
  });

  test("sin favoritos muestra el estado vacío", async () => {
    montarApi({ recomendados: { items: [], categorias: [], motivo: null, sinFavoritos: true } });
    const onDisponibilidad = jest.fn();
    await renderConTema(
      <CarruselRecomendados
        onVerTodos={jest.fn()}
        onAbrirEvento={jest.fn()}
        onDisponibilidad={onDisponibilidad}
      />,
    );
    expect(await screen.findByText(/Guardá eventos en favoritos y te recomendamos/)).toBeTruthy();
    expect(onDisponibilidad).toHaveBeenCalledWith(false);
  });
});
