import {
  categoriasPreferidas,
  ordenarRecomendados,
  puntajeRecomendacion,
} from "../domain/recomendacionDominio.js";

const ev = (categoriaId, extra = {}) => ({ categoriaId, ...extra });

describe("Dominio recomendaciones", () => {
  test("sin favoritos devuelve []", () => {
    expect(categoriasPreferidas([])).toEqual([]);
    expect(categoriasPreferidas()).toEqual([]);
  });

  test("ordena por frecuencia y calcula el peso sobre el total de favoritos", () => {
    const favoritos = [ev("musica"), ev("teatro"), ev("musica"), ev("cine"), ev("musica")];
    expect(categoriasPreferidas(favoritos)).toEqual([
      { categoriaId: "musica", cantidad: 3, peso: 0.6 },
      { categoriaId: "cine", cantidad: 1, peso: 0.2 },
      { categoriaId: "teatro", cantidad: 1, peso: 0.2 },
    ]);
  });

  test("ante un empate gana la categoría del favorito más reciente", () => {
    const favoritos = [ev("teatro"), ev("musica"), ev("teatro"), ev("musica")];
    expect(categoriasPreferidas(favoritos).map((c) => c.categoriaId)).toEqual(["musica", "teatro"]);
  });

  test("respeta el límite de categorías (3 por defecto)", () => {
    const favoritos = ["a", "b", "c", "d", "e"].map((c) => ev(c));
    expect(categoriasPreferidas(favoritos)).toHaveLength(3);
    expect(categoriasPreferidas(favoritos, { maxCategorias: 1 })).toHaveLength(1);
  });

  test("cuenta los favoritos de eventos finalizados", () => {
    const favoritos = [
      ev("teatro", { activo: false }),
      ev("teatro", { activo: false }),
      ev("cine"),
    ];
    expect(categoriasPreferidas(favoritos)[0]).toEqual({
      categoriaId: "teatro",
      cantidad: 2,
      peso: 2 / 3,
    });
  });

  test("agrupa categorías aunque vengan como objeto con id", () => {
    const favoritos = [ev({ id: "musica" }), ev("musica")];
    expect(categoriasPreferidas(favoritos)).toEqual([
      { categoriaId: "musica", cantidad: 2, peso: 1 },
    ]);
  });

  test("puntajeRecomendacion es el peso de la categoría o 0", () => {
    const preferidas = [{ categoriaId: "musica", cantidad: 2, peso: 0.5 }];
    expect(puntajeRecomendacion(ev("musica"), preferidas)).toBe(0.5);
    expect(puntajeRecomendacion(ev("cine"), preferidas)).toBe(0);
  });

  test("ordenarRecomendados: primero el peso y después la fecha más próxima", () => {
    const preferidas = [
      { categoriaId: "musica", cantidad: 3, peso: 0.75 },
      { categoriaId: "teatro", cantidad: 1, peso: 0.25 },
    ];
    const eventos = [
      ev("teatro", { id: "t", fecha: "2026-12-02" }),
      ev("cine", { id: "c", fecha: "2026-12-01" }),
      ev("musica", { id: "m-lejos", fecha: "2026-12-30" }),
      ev("musica", { id: "m-cerca", fecha: "2026-12-05" }),
    ];
    expect(ordenarRecomendados(eventos, preferidas).map((e) => e.id)).toEqual([
      "m-cerca",
      "m-lejos",
      "t",
      "c",
    ]);
  });
});
