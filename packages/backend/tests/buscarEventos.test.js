import { Categoria } from "../domain/categoriaDominio.js";
import { Evento } from "../domain/eventoDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import { Usuario } from "../domain/usuarioDominio.js";
import { CategoriasMongoRepository } from "../repositories/mongo/CategoriasMongoRepository.js";
import { EventosMongoRepository } from "../repositories/mongo/EventosMongoRepository.js";
import { UsuariosMongoRepository } from "../repositories/mongo/UsuariosMongoRepository.js";
import { bajarDB, levantarDB } from "./helpers/dbMemoria.js";
import { AHORA, DIA, relojFijo } from "./helpers/fabricasDominio.js";

const reloj = relojFijo();
const usuarios = new UsuariosMongoRepository();
const categoriasRepo = new CategoriasMongoRepository();
const eventos = new EventosMongoRepository({ reloj });

const enDias = (d) => new Date(AHORA.getTime() + d * DIA);
const nombres = (resultado) => resultado.items.map((e) => e.nombre);

let cat;
let org;

beforeAll(async () => {
  await levantarDB();

  const organizador = (nombre, apellido, puntaje) => {
    const u = new Usuario({
      nombre,
      apellido,
      email: `${nombre.toLowerCase()}@test.com`,
      passwordHash: "h",
      rol: Roles.ORGANIZADOR,
      puntajePromedio: puntaje,
      cantidadResenias: puntaje ? 1 : 0,
    });
    return usuarios.guardar(u);
  };
  org = {
    lucia: await organizador("Lucía", "Ferrari", 4.5),
    martin: await organizador("Martín", "Ocampo", 3),
    sofia: await organizador("Sofía", "Benítez", 0),
  };
  cat = {};
  for (const nombre of ["Recitales", "Teatro", "Deportes"]) {
    cat[nombre] = await categoriasRepo.guardar(new Categoria({ nombre }));
  }

  const crear = async ({
    nombre,
    categoria,
    organizador,
    dias,
    precios,
    disponibles,
    ...extra
  }) => {
    const evento = new Evento({
      nombre,
      descripcion: extra.descripcion ?? `Descripción de ${nombre}`,
      categoriaId: cat[categoria].id,
      fecha: enDias(dias),
      lugar: extra.lugar ?? "CABA",
      organizadorId: org[organizador].id,
      tiposEntrada: precios.map((precio, i) => ({
        nombre: `Tipo ${i}`,
        precio,
        cupo: 10,
        disponibles: disponibles?.[i] ?? 10,
      })),
    });
    if (dias < 0) evento.finalizar({ id: "SISTEMA" }, reloj);
    return eventos.guardar(evento);
  };

  await crear({
    nombre: "Jazz en el Sótano",
    categoria: "Recitales",
    organizador: "lucia",
    dias: 5,
    precios: [18000, 42000],
    descripcion: "Música de cámara y jazz",
  });
  await crear({
    nombre: "Rock Nacional",
    categoria: "Recitales",
    organizador: "lucia",
    dias: 12,
    precios: [25000],
  });
  await crear({
    nombre: "Hamlet",
    categoria: "Teatro",
    organizador: "martin",
    dias: 7,
    precios: [15000, 22000],
    lugar: "Teatro Colón",
  });
  await crear({
    nombre: "Comedia agotada",
    categoria: "Teatro",
    organizador: "martin",
    dias: 3,
    precios: [9000],
    disponibles: [0],
  });
  await crear({
    nombre: "Final de Básquet",
    categoria: "Deportes",
    organizador: "sofia",
    dias: 20,
    precios: [7000],
  });
  await crear({
    nombre: "Recital pasado",
    categoria: "Recitales",
    organizador: "lucia",
    dias: -10,
    precios: [15000],
  });
  await crear({
    nombre: "Maratón pasada",
    categoria: "Deportes",
    organizador: "sofia",
    dias: -20,
    precios: [18000],
  });
});

afterAll(bajarDB);

describe("EventosMongoRepository.buscar", () => {
  test("sin filtros: solo activos y futuros, ordenados por fecha ascendente", async () => {
    const r = await eventos.buscar();
    expect(nombres(r)).toEqual([
      "Comedia agotada",
      "Jazz en el Sótano",
      "Hamlet",
      "Rock Nacional",
      "Final de Básquet",
    ]);
    expect(r).toMatchObject({ total: 5, pagina: 1, limite: 10 });
  });

  test.each([
    ["jaz", ["Jazz en el Sótano"]],
    ["SÓTANO", ["Jazz en el Sótano"]],
    ["camara", ["Jazz en el Sótano"]], // descripción, sin acento
    ["colon", ["Hamlet"]], // lugar
    ["ferrari", ["Jazz en el Sótano", "Rock Nacional"]], // nombre del organizador
    ["benitez", ["Final de Básquet"]],
    ["(", []], // caracteres especiales de regex no rompen
    [
      "   ",
      ["Comedia agotada", "Jazz en el Sótano", "Hamlet", "Rock Nacional", "Final de Básquet"],
    ],
  ])("texto q=%p", async (q, esperado) => {
    expect(nombres(await eventos.buscar({ q }))).toEqual(esperado);
  });

  test("varias categorías", async () => {
    const r = await eventos.buscar({ categoriaIds: [cat.Teatro.id, cat.Deportes.id] });
    expect(nombres(r)).toEqual(["Comedia agotada", "Hamlet", "Final de Básquet"]);
  });

  test.each([
    [{ precioMin: 20000 }, ["Jazz en el Sótano", "Hamlet", "Rock Nacional"]],
    [{ precioMax: 9000 }, ["Comedia agotada", "Final de Básquet"]],
    [{ precioMin: 19000, precioMax: 24000 }, ["Hamlet"]],
    [{ precioMin: 43000 }, []],
  ])("rango de precio %p (algún tipo dentro del rango)", async (filtro, esperado) => {
    expect(nombres(await eventos.buscar(filtro))).toEqual(esperado);
  });

  test("rango de fechas", async () => {
    expect(
      nombres(await eventos.buscar({ fechaDesde: enDias(4), fechaHasta: enDias(12) })),
    ).toEqual(["Jazz en el Sótano", "Hamlet", "Rock Nacional"]);
    expect(nombres(await eventos.buscar({ fechaDesde: enDias(13) }))).toEqual(["Final de Básquet"]);
  });

  test("conDisponibilidad excluye los agotados", async () => {
    expect(nombres(await eventos.buscar({ conDisponibilidad: true }))).not.toContain(
      "Comedia agotada",
    );
    expect((await eventos.buscar({ conDisponibilidad: true })).total).toBe(4);
  });

  test("puntajeMin filtra por el puntaje del organizador", async () => {
    expect(nombres(await eventos.buscar({ puntajeMin: 4 }))).toEqual([
      "Jazz en el Sótano",
      "Rock Nacional",
    ]);
    expect((await eventos.buscar({ puntajeMin: 3 })).total).toBe(4);
  });

  test("organizadorId y excluirIds", async () => {
    const todos = await eventos.buscar({ organizadorId: org.lucia.id });
    expect(nombres(todos)).toEqual(["Jazz en el Sótano", "Rock Nacional"]);
    const sinJazz = await eventos.buscar({
      organizadorId: org.lucia.id,
      excluirIds: [todos.items[0].id],
    });
    expect(nombres(sinJazz)).toEqual(["Rock Nacional"]);
  });

  test("orden por precio mínimo, ascendente y descendente", async () => {
    expect(nombres(await eventos.buscar({ orden: "precio" }))).toEqual([
      "Final de Básquet",
      "Comedia agotada",
      "Hamlet",
      "Jazz en el Sótano",
      "Rock Nacional",
    ]);
    expect(nombres(await eventos.buscar({ orden: "precio", direccion: "desc" }))[0]).toBe(
      "Rock Nacional",
    );
  });

  test("orden por puntaje del organizador (desc por defecto, desempata por fecha)", async () => {
    expect(nombres(await eventos.buscar({ orden: "puntaje" }))).toEqual([
      "Jazz en el Sótano",
      "Rock Nacional",
      "Comedia agotada",
      "Hamlet",
      "Final de Básquet",
    ]);
    expect(nombres(await eventos.buscar({ orden: "puntaje", direccion: "asc" }))[0]).toBe(
      "Final de Básquet",
    );
  });

  test("orden por fecha descendente", async () => {
    expect(nombres(await eventos.buscar({ orden: "fecha", direccion: "desc" }))[0]).toBe(
      "Final de Básquet",
    );
  });

  test("paginación", async () => {
    const p1 = await eventos.buscar({ limite: 2, pagina: 1 });
    const p3 = await eventos.buscar({ limite: 2, pagina: 3 });
    expect(nombres(p1)).toEqual(["Comedia agotada", "Jazz en el Sótano"]);
    expect(nombres(p3)).toEqual(["Final de Básquet"]);
    expect(p3).toMatchObject({ total: 5, pagina: 3, limite: 2 });
    expect((await eventos.buscar({ limite: 500 })).limite).toBe(50);
  });

  test("anteriores=true trae los ya ocurridos/finalizados, del más reciente al más viejo", async () => {
    const r = await eventos.buscar({ anteriores: true });
    expect(nombres(r)).toEqual(["Recital pasado", "Maratón pasada"]);
    expect(r.items.every((e) => e.activo === false)).toBe(true);
    expect(
      nombres(await eventos.buscar({ anteriores: true, categoriaIds: [cat.Deportes.id] })),
    ).toEqual(["Maratón pasada"]);
  });

  test("filtros combinados", async () => {
    const r = await eventos.buscar({
      q: "ferrari",
      precioMin: 20000,
      conDisponibilidad: true,
      orden: "precio",
      direccion: "desc",
    });
    expect(nombres(r)).toEqual(["Rock Nacional", "Jazz en el Sótano"]);
  });
});
