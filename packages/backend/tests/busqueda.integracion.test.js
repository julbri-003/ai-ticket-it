import { categoriasRepository } from "../dependencias.js";
import {
  app,
  auth,
  cerrarApi,
  prepararApiConSemilla,
  request,
  sinCamposInternos,
} from "./helpers/apiSemilla.js";

const DIA = 24 * 60 * 60 * 1000;
const cat = {};

async function buscar(query, headers = {}) {
  const res = await request(app).get("/api/eventos").query(query).set(headers);
  expect(res.status).toBe(200);
  return res.body;
}
const nombres = (body) => body.items.map((e) => e.nombre);

beforeAll(async () => {
  await prepararApiConSemilla();
  for (const c of await categoriasRepository.listar()) cat[c.nombre] = c.id;
});
afterAll(cerrarApi);

describe("GET /api/eventos (buscador)", () => {
  test("sin filtros: activos y futuros por fecha, con filtrosAplicados y sin campos internos", async () => {
    const body = await buscar({ limite: 50 });
    expect(body.total).toBe(13);
    expect(nombres(body)[0]).toBe("Folklore bajo las estrellas"); // el más próximo (< 48 h)
    const fechas = body.items.map((e) => Date.parse(e.fecha));
    expect(fechas).toEqual([...fechas].sort((a, b) => a - b));
    expect(body.filtrosAplicados).toMatchObject({
      orden: "fecha",
      paraVos: false,
      anteriores: false,
      pagina: 1,
      limite: 50,
    });
    expect(body.items.every((e) => e.yaOcurrio === false && e.imagen?.url)).toBe(true);
    expect(sinCamposInternos(body)).toBe(true);
  });

  test.each([
    ["jaz", ["Noche de Jazz en el Sótano"]],
    ["SOTANO", ["Noche de Jazz en el Sótano"]],
    ["usina", ["Jornada de Innovación y Diseño"]], // lugar
    [
      "benitez",
      [
        "Títeres en la plaza",
        "Final del Torneo Regional de Básquet",
        "Jornada de Innovación y Diseño",
      ],
    ], // organizador
  ])("q=%p", async (q, esperado) => {
    expect(nombres(await buscar({ q }))).toEqual(esperado);
  });

  test("CU3: buscar por texto (sin mayúsculas ni acentos) y explorar por categoría", async () => {
    expect(nombres(await buscar({ q: "HAMLET" }))).toEqual(["Hamlet, versión de bolsillo"]);
    expect(nombres(await buscar({ q: "bolsillo", categoriaIds: cat.Teatro }))).toEqual([
      "Hamlet, versión de bolsillo",
    ]);
    expect(nombres(await buscar({ q: "hamlet", categoriaIds: cat.Recitales }))).toEqual([]);
    expect(nombres(await buscar({ categoriaIds: cat.Teatro }))).toEqual([
      "Hamlet, versión de bolsillo",
      "La Casa de Bernarda Alba",
    ]);
  });

  test("varias categorías (CSV)", async () => {
    const body = await buscar({ categoriaIds: `${cat.Teatro},${cat.Danza}` });
    expect(nombres(body)).toEqual([
      "Hamlet, versión de bolsillo",
      "La Casa de Bernarda Alba",
      "Tango y Contemporáneo",
    ]);
    expect(body.filtrosAplicados.categoriaIds).toEqual([cat.Teatro, cat.Danza]);
  });

  test("rango de precio sobre el precio mínimo del evento (su entrada más barata)", async () => {
    const todos = (await buscar({ limite: 50 })).items;
    const esperados = (min, max) =>
      todos
        .filter(
          (e) => (min == null || e.precioMinimo >= min) && (max == null || e.precioMinimo <= max),
        )
        .map((e) => e.nombre);

    for (const [min, max] of [
      [15000, undefined],
      [undefined, 5000],
      [15000, 16000],
      [40000, undefined],
    ]) {
      const body = await buscar({
        limite: 50,
        ...(min != null && { precioMin: min }),
        ...(max != null && { precioMax: max }),
      });
      expect(nombres(body)).toEqual(esperados(min, max));
      for (const e of body.items) {
        if (min != null) expect(e.precioMinimo).toBeGreaterThanOrEqual(min);
        if (max != null) expect(e.precioMinimo).toBeLessThanOrEqual(max);
      }
    }
    // Un evento con alguna entrada ≥ mínimo pero otra más barata NO entra.
    const mixto = todos.find((e) => e.tiposEntrada.some((t) => t.precio > e.precioMinimo));
    if (mixto) {
      const corte = Math.max(...mixto.tiposEntrada.map((t) => t.precio));
      expect(nombres(await buscar({ precioMin: corte, limite: 50 }))).not.toContain(mixto.nombre);
    }
  });

  test("rango de fechas (fechaHasta con solo fecha incluye todo el día)", async () => {
    const hasta = new Date(Date.now() + 4 * DIA).toISOString().slice(0, 10);
    const body = await buscar({ fechaHasta: hasta });
    expect(nombres(body)).toEqual(
      expect.arrayContaining([
        "Folklore bajo las estrellas",
        "Risas de Martes",
        "Títeres en la plaza",
      ]),
    );
    expect(
      body.items.every((e) => Date.parse(e.fecha) <= Date.parse(`${hasta}T23:59:59.999Z`)),
    ).toBe(true);
    const desde = await buscar({ fechaDesde: new Date(Date.now() + 16 * DIA).toISOString() });
    expect(nombres(desde)).toEqual(["Tango y Contemporáneo", "Festival Primavera Sonora"]);
  });

  test("conDisponibilidad excluye el evento agotado", async () => {
    const body = await buscar({ conDisponibilidad: "true", limite: 50 });
    expect(body.total).toBe(12);
    expect(nombres(body)).not.toContain("Stand-up: Noche de Estrenos");
  });

  test("puntajeMin filtra por el puntaje del organizador", async () => {
    const body = await buscar({ puntajeMin: 4.6, limite: 50 });
    expect(body.items.every((e) => e.organizador.nombre === "Lucía Ferrari")).toBe(true);
    expect(body.total).toBe(5);
  });

  test("los tres órdenes con dirección", async () => {
    const porPrecio = await buscar({ orden: "precio", limite: 50 });
    const precios = porPrecio.items.map((e) => e.precioMinimo);
    expect(precios).toEqual([...precios].sort((a, b) => a - b));
    const porPrecioDesc = await buscar({ orden: "precio", direccion: "desc" });
    expect(porPrecioDesc.items[0].nombre).toBe("Festival Primavera Sonora");

    const porPuntaje = await buscar({ orden: "puntaje", limite: 50 });
    const puntajes = porPuntaje.items.map((e) => e.organizador.puntajePromedio);
    expect(puntajes).toEqual([...puntajes].sort((a, b) => b - a));

    const porFechaDesc = await buscar({ orden: "fecha", direccion: "desc" });
    expect(porFechaDesc.items[0].nombre).toBe("Festival Primavera Sonora");
  });

  test("filtros combinados", async () => {
    const body = await buscar({
      categoriaIds: cat.Recitales,
      precioMax: 20000,
      conDisponibilidad: "true",
      orden: "precio",
    });
    expect(nombres(body)).toEqual(["Folklore bajo las estrellas", "Noche de Jazz en el Sótano"]);
  });

  test("paginación", async () => {
    const p1 = await buscar({ limite: 5, pagina: 1 });
    const p3 = await buscar({ limite: 5, pagina: 3 });
    expect(p1.items).toHaveLength(5);
    expect(p3).toMatchObject({ total: 13, pagina: 3, limite: 5 });
    expect(p3.items).toHaveLength(3);
  });

  test("anteriores=true trae los finalizados, del más reciente al más viejo", async () => {
    const body = await buscar({ anteriores: "true" });
    expect(nombres(body)).toEqual([
      "Comedia de Enredos",
      "Recital Acústico de Otoño",
      "Maratón Urbana 10K",
    ]);
    expect(body.items.every((e) => e.yaOcurrio && e.finalizado)).toBe(true);
  });

  test.each([
    [{ precioMin: 20000, precioMax: 10000 }, "precio mínimo no puede ser mayor"],
    [{ fechaDesde: "2027-01-10", fechaHasta: "2027-01-01" }, "fecha desde no puede ser posterior"],
    [{ limite: 51 }, "como máximo 50"],
    [{ pagina: 0 }, "pagina"],
    [{ categoriaIds: "abc" }, "identificador válido"],
    [{ orden: "nombre" }, "orden debe ser"],
    [{ orden: "relevancia" }, "solo se puede usar con paraVos"],
    [{ conDisponibilidad: "si" }, "true"],
    [{ puntajeMin: 6 }, "entre 0 y 5"],
    [{ fechaDesde: "mañana" }, "fecha ISO"],
  ])("query inválida %p → 400 con mensaje claro", async (query, texto) => {
    const res = await request(app).get("/api/eventos").query(query);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(texto);
    expect(res.body.detalles.length).toBeGreaterThan(0);
  });

  test("con sesión de comprador cada evento trae esFavorito; con token inválido sigue como anónimo", async () => {
    const conSesion = await buscar({ q: "jazz" }, await auth("ana@ticketit.test"));
    expect(conSesion.items[0].esFavorito).toBe(true);
    const organizador = await buscar({ q: "jazz" }, await auth("lucia@ticketit.test"));
    expect(organizador.items[0]).not.toHaveProperty("esFavorito");
    const vencido = await buscar({ q: "jazz" }, { Authorization: "Bearer token-vencido" });
    expect(vencido.items[0]).not.toHaveProperty("esFavorito");
  });
});
