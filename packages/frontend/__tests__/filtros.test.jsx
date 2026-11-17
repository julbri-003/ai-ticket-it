import { act, renderHook } from "@testing-library/react-native";
import {
  armarQuery,
  contarFiltrosPanel,
  FILTROS_INICIALES,
  pillsAplicadas,
  quitarFiltro,
  useFiltrosEventos,
  validarFiltros,
} from "../src/hooks/useFiltrosEventos";
import { diasRestantesTexto, textoAFechaIso } from "../src/utils/fechas";

const con = (extra) => ({ ...FILTROS_INICIALES, ...extra });

describe("useFiltrosEventos (funciones puras)", () => {
  test("query por defecto: página 1, límite 10, orden fecha", () => {
    expect(armarQuery(FILTROS_INICIALES)).toEqual({ pagina: 1, limite: 10, orden: "fecha" });
  });

  test("arma la query con todos los filtros", () => {
    const query = armarQuery(
      con({
        q: "  jazz ",
        paraVos: true,
        categoriaIds: ["a", "b"],
        orden: "precio",
        direccion: "desc",
        precioMin: "1000",
        precioMax: "20.000".replace(".", ""),
        fechaDesde: "01/12/2030",
        fechaHasta: "31/12/2030",
        conDisponibilidad: true,
        puntajeMin: 4.5,
        anteriores: true,
        pagina: 3,
      }),
    );
    expect(query).toEqual({
      pagina: 3,
      limite: 10,
      q: "jazz",
      paraVos: "true",
      categoriaIds: "a,b",
      orden: "precio",
      direccion: "desc",
      precioMin: 1000,
      precioMax: 20000,
      fechaDesde: "2030-12-01",
      fechaHasta: "2030-12-31",
      conDisponibilidad: "true",
      puntajeMin: 4.5,
      anteriores: "true",
    });
  });

  test("cuenta los filtros activos del panel", () => {
    expect(contarFiltrosPanel(FILTROS_INICIALES)).toBe(0);
    expect(
      contarFiltrosPanel(
        con({
          precioMin: "10",
          precioMax: "20",
          fechaDesde: "01/12/2030",
          conDisponibilidad: true,
          puntajeMin: 4,
          orden: "precio",
        }),
      ),
    ).toBe(5);
  });

  test("valida rangos de precio y fechas", () => {
    expect(validarFiltros(con({ precioMin: "500", precioMax: "100" })).precioMax).toMatch(
      /mayor o igual/,
    );
    expect(validarFiltros(con({ precioMin: "abc" })).precioMin).toMatch(/válido/);
    expect(validarFiltros(con({ fechaDesde: "31/02/2030" })).fechaDesde).toMatch(/DD\/MM\/AAAA/);
    expect(
      validarFiltros(con({ fechaDesde: "10/12/2030", fechaHasta: "01/12/2030" })).fechaHasta,
    ).toMatch(/anterior/);
    expect(
      validarFiltros(con({ precioMin: "100", precioMax: "100", fechaDesde: "01/12/2030" })),
    ).toEqual({});
  });

  test("pills aplicadas y quitar una pill", () => {
    const filtros = con({
      paraVos: true,
      categoriaIds: ["c1"],
      conDisponibilidad: true,
      orden: "relevancia",
    });
    const pills = pillsAplicadas(filtros, [{ id: "c1", nombre: "Recitales" }]);
    expect(pills.map((p) => p.etiqueta)).toEqual([
      "✦ Para vos",
      "Recitales",
      "Con entradas",
      "Orden: Relevancia",
    ]);
    // Quitar "Para vos" también saca el orden por relevancia (solo vale con Para vos).
    expect(quitarFiltro(filtros, "paraVos")).toMatchObject({
      paraVos: false,
      orden: "fecha",
      pagina: 1,
    });
    expect(quitarFiltro(filtros, "categoria:c1").categoriaIds).toEqual([]);
  });
});

describe("useFiltrosEventos (hook)", () => {
  test("aplicar, togglear y quitar actualizan la query y vuelven a la página 1", async () => {
    const { result } = await renderHook(() => useFiltrosEventos());
    await act(() => result.current.setPagina(4));
    expect(result.current.query.pagina).toBe(4);
    await act(() => result.current.toggleCategoria("c1"));
    expect(result.current.query).toMatchObject({ pagina: 1, categoriaIds: "c1" });
    await act(() => result.current.toggleParaVos());
    expect(result.current.query.paraVos).toBe("true");
    await act(() => result.current.aplicar({ precioMin: "100", precioMax: "50" }));
    expect(result.current.errores.precioMax).toBeTruthy();
    expect(result.current.filtrosActivos).toBe(1);
    await act(() => result.current.quitar("precio"));
    expect(result.current.filtrosActivos).toBe(0);
    await act(() => result.current.limpiar());
    expect(result.current.query).toEqual({ pagina: 1, limite: 10, orden: "fecha" });
  });
});

test("utils/fechas", () => {
  expect([0, 1, 5].map(diasRestantesTexto)).toEqual(["Hoy", "Mañana", "Faltan 5 días"]);
  expect(textoAFechaIso("29/02/2028")).toBe("2028-02-29");
  expect(textoAFechaIso("29/02/2029")).toBeNull();
});
