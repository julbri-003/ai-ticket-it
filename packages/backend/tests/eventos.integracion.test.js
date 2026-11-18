import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { categoriasRepository } from "../dependencias.js";
import {
  app,
  auth,
  cerrarApi,
  eventoSemilla,
  prepararApiConSemilla,
  request,
  sinCamposInternos,
} from "./helpers/apiSemilla.js";

const LUCIA = "lucia@ticketit.test";
const MARTIN = "martin@ticketit.test";
const ANA = "ana@ticketit.test";
const PNG = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "seeds",
  "assets",
  "teatro.png",
);
const DIA = 24 * 60 * 60 * 1000;

let categoriaId;

const nuevoEvento = (extra = {}) => ({
  nombre: "Concierto de prueba",
  descripcion: "Un concierto para los tests",
  categoriaId,
  fecha: new Date(Date.now() + 15 * DIA).toISOString(),
  lugar: "Sala de Tests",
  tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 50 }],
  ...extra,
});

async function crearEventoDeLucia(extra) {
  const res = await request(app)
    .post("/api/eventos")
    .set(await auth(LUCIA))
    .send(nuevoEvento(extra));
  expect(res.status).toBe(201);
  return res.body;
}

beforeAll(async () => {
  await prepararApiConSemilla();
  categoriaId = (await categoriasRepository.obtenerPorNombre("Recitales")).id;
});
afterAll(cerrarApi);

describe("POST /api/eventos", () => {
  test("un organizador crea un evento", async () => {
    const evento = await crearEventoDeLucia();
    expect(evento).toMatchObject({
      nombre: "Concierto de prueba",
      categoria: { id: categoriaId, nombre: "Recitales" },
      organizador: { nombre: "Lucía Ferrari", puntajePromedio: 5, cantidadResenias: 1 },
      precioMinimo: 1000,
      yaOcurrio: false,
      finalizado: false,
      multimedia: [],
      imagen: null,
    });
    expect(evento.tiposEntrada[0]).toMatchObject({
      nombre: "General",
      cupo: 50,
      disponibles: 50,
      vendidas: 0,
    });
    expect(sinCamposInternos(evento)).toBe(true);
  });

  test("un comprador no puede crear eventos → 403; sin sesión → 401", async () => {
    expect(
      (
        await request(app)
          .post("/api/eventos")
          .set(await auth(ANA))
          .send(nuevoEvento())
      ).status,
    ).toBe(403);
    expect((await request(app).post("/api/eventos").send(nuevoEvento())).status).toBe(401);
  });

  test.each([
    [{ fecha: new Date(Date.now() - DIA).toISOString() }, "futura"],
    [{ tiposEntrada: [] }, "al menos un tipo"],
    [{ tiposEntrada: undefined }, "tiposEntrada"],
    [{ categoriaId: "64a5f2c1e4b0a1b2c3d4ffff" }, "categoría indicada no existe"],
    [{ fecha: "2026-12-20" }, "hora y zona"],
    [{ organizadorId: "otro" }, "organizadorId"], // .strict()
    [
      {
        tiposEntrada: [
          { nombre: "VIP", precio: 1, cupo: 1 },
          { nombre: "vip", precio: 2, cupo: 1 },
        ],
      },
      "Ya existe un tipo",
    ],
  ])("datos inválidos %p → 400", async (extra, texto) => {
    const res = await request(app)
      .post("/api/eventos")
      .set(await auth(LUCIA))
      .send(nuevoEvento(extra));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain(texto);
  });
});

describe("Ubicación en el mapa (spec 11)", () => {
  const UBICACION = { lat: -34.6213, lng: -58.3731, direccion: "Defensa 1200, San Telmo, CABA" };

  test("se crea con ubicación y vuelve en el detalle, el buscador y Mis eventos", async () => {
    const evento = await crearEventoDeLucia({ nombre: "Con mapa", ubicacion: UBICACION });
    expect(evento.ubicacion).toEqual(UBICACION);
    const detalle = await request(app).get(`/api/eventos/${evento.id}`);
    expect(detalle.body.ubicacion).toEqual(UBICACION);
    const busqueda = await request(app).get("/api/eventos").query({ q: "con mapa" });
    expect(busqueda.body.items.find((e) => e.id === evento.id).ubicacion).toEqual(UBICACION);
    const mios = await request(app)
      .get("/api/eventos/mios")
      .set(await auth(LUCIA));
    expect(mios.body.find((e) => e.id === evento.id).ubicacion).toEqual(UBICACION);
  });

  test("sin ubicación (o con null) devuelve ubicacion: null", async () => {
    expect((await crearEventoDeLucia()).ubicacion).toBeNull();
    expect((await crearEventoDeLucia({ ubicacion: null })).ubicacion).toBeNull();
  });

  test.each([
    [{ ...UBICACION, lat: -91 }, "latitud"],
    [{ ...UBICACION, lng: 181 }, "longitud"],
    [{ lat: -34.6, lng: -58.4 }, "dirección"],
    [{ ...UBICACION, direccion: "x" }, "al menos 5"],
    [{ ...UBICACION, direccion: "x".repeat(201) }, "200"],
    [{ ...UBICACION, altura: 3 }, ""], // .strict()
  ])("ubicación inválida %p → 400", async (ubicacion, texto) => {
    const res = await request(app)
      .post("/api/eventos")
      .set(await auth(LUCIA))
      .send(nuevoEvento({ ubicacion }));
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(texto);
  });

  test("la semilla trae coordenadas en los lugares reales", async () => {
    const { items } = (await request(app).get("/api/eventos").query({ limite: 50 })).body;
    expect(items.some((e) => e.ubicacion?.direccion)).toBe(true);
  });
});

describe("GET /api/eventos/:id", () => {
  test("detalle con tipos, organizador, ampliaciones y URL absoluta de la imagen", async () => {
    const hamlet = await eventoSemilla("hamlet");
    const res = await request(app).get(`/api/eventos/${hamlet.id}`);
    expect(res.status).toBe(200);
    expect(res.body.ampliacionesDescripcion).toHaveLength(1);
    expect(res.body.organizador).toMatchObject({ nombre: "Martín Ocampo", puntajePromedio: 4.5 });
    expect(res.body.imagen.url).toMatch(
      /^http:\/\/127\.0\.0\.1:\d+\/uploads\/semilla\/teatro\.png$/,
    );
    expect(res.body.imagen.alt).toContain("telón");
    expect(res.body).not.toHaveProperty("esFavorito");
    expect(sinCamposInternos(res.body)).toBe(true);
  });

  test("usa PUBLIC_BASE_URL si está configurada", async () => {
    const hamlet = await eventoSemilla("hamlet");
    process.env.PUBLIC_BASE_URL = "http://192.168.0.10:8000/";
    try {
      const res = await request(app).get(`/api/eventos/${hamlet.id}`);
      expect(res.body.imagen.url).toBe("http://192.168.0.10:8000/uploads/semilla/teatro.png");
    } finally {
      delete process.env.PUBLIC_BASE_URL;
    }
  });

  test("un evento finalizado se puede ver (Eventos anteriores)", async () => {
    const acustico = await eventoSemilla("acustico");
    const res = await request(app).get(`/api/eventos/${acustico.id}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ yaOcurrio: true, finalizado: true });
  });

  test("id inválido → 400; inexistente → 404", async () => {
    expect((await request(app).get("/api/eventos/no-es-id")).status).toBe(400);
    expect((await request(app).get("/api/eventos/64a5f2c1e4b0a1b2c3d4ffff")).status).toBe(404);
  });
});

describe("Edición restringida", () => {
  let evento;
  beforeAll(async () => {
    evento = await crearEventoDeLucia({ nombre: "Evento para editar" });
  });

  test("agregar un tipo de entrada", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/tipos-entrada`)
      .set(await auth(LUCIA))
      .send({ nombre: "Platea", precio: 3000, cupo: 10 });
    expect(res.status).toBe(201);
    expect(res.body.tiposEntrada.map((t) => t.nombre)).toEqual(["General", "Platea"]);
  });

  test("un tipo con nombre repetido → 400", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/tipos-entrada`)
      .set(await auth(LUCIA))
      .send({ nombre: "general", precio: 3000, cupo: 10 });
    expect(res.status).toBe(400);
  });

  test("ampliar la descripción sin tocar la original", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/ampliaciones`)
      .set(await auth(LUCIA))
      .send({ texto: "Cambia la hora de apertura de puertas" });
    expect(res.status).toBe(201);
    expect(res.body.descripcion).toBe("Un concierto para los tests");
    expect(res.body.ampliacionesDescripcion[0].texto).toBe("Cambia la hora de apertura de puertas");
  });

  test("editar la descripción original: no existe la ruta (PUT/PATCH) y el body estricto la rechaza", async () => {
    const headers = await auth(LUCIA);
    expect(
      (await request(app).put(`/api/eventos/${evento.id}`).set(headers).send({ descripcion: "x" }))
        .status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .patch(`/api/eventos/${evento.id}`)
          .set(headers)
          .send({ descripcion: "x" })
      ).status,
    ).toBe(404);
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/ampliaciones`)
      .set(headers)
      .send({ texto: "ok", descripcion: "x" });
    expect(res.status).toBe(400);
  });

  test("otro organizador no puede editar → 403", async () => {
    const headers = await auth(MARTIN);
    const intentos = [
      request(app).post(`/api/eventos/${evento.id}/ampliaciones`).set(headers).send({ texto: "x" }),
      request(app)
        .post(`/api/eventos/${evento.id}/tipos-entrada`)
        .set(headers)
        .send({ nombre: "X", precio: 1, cupo: 1 }),
      request(app)
        .delete(`/api/eventos/${evento.id}/multimedia`)
        .set(headers)
        .send({ ruta: "/x.png" }),
      request(app)
        .post(`/api/eventos/${evento.id}/multimedia`)
        .set(headers)
        .attach("archivos", PNG)
        .field("alts", "x"),
    ];
    for (const res of await Promise.all(intentos)) expect(res.status).toBe(403);
  });

  test("un comprador no puede editar → 403", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/ampliaciones`)
      .set(await auth(ANA))
      .send({ texto: "x" });
    expect(res.status).toBe(403);
  });

  test("un evento que ya ocurrió no se edita → 409", async () => {
    const acustico = await eventoSemilla("acustico");
    const res = await request(app)
      .post(`/api/eventos/${acustico.id}/ampliaciones`)
      .set(await auth(LUCIA))
      .send({ texto: "Tarde" });
    expect(res.status).toBe(409);
  });
});

describe("Multimedia", () => {
  let evento;
  beforeAll(async () => {
    evento = await crearEventoDeLucia({ nombre: "Evento con fotos" });
  });

  test("sube una imagen con texto alternativo y devuelve la URL absoluta", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", PNG)
      .field("alts", "Escenario con telón rojo");
    expect(res.status).toBe(201);
    const [imagen] = res.body.multimedia;
    expect(imagen).toMatchObject({ tipo: "imagen", alt: "Escenario con telón rojo" });
    expect(imagen.ruta).toMatch(/^\/uploads\/eventos\/[0-9a-f-]{36}\.png$/);
    expect(imagen.url).toMatch(/^http:\/\/.+\/uploads\/eventos\//);
    expect(
      fs.existsSync(path.join(process.env.UPLOADS_DIR, "eventos", path.basename(imagen.ruta))),
    ).toBe(true);

    const servido = await request(app).get(imagen.ruta);
    expect(servido.status).toBe(200);
    expect(servido.headers["content-type"]).toBe("image/png");
  });

  test("un video sin texto alternativo → 400; con texto alternativo se sube", async () => {
    const sinAlt = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", Buffer.from("video"), {
        filename: "ensayo.mp4",
        contentType: "video/mp4",
      });
    expect(sinAlt.status).toBe(400);
    expect(sinAlt.body.message).toContain("texto alternativo del video");

    const conAlt = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", Buffer.from("video"), {
        filename: "ensayo.mp4",
        contentType: "video/mp4",
      })
      .field("alts", "Ensayo general con la banda completa");
    expect(conAlt.status).toBe(201);
    expect(conAlt.body.multimedia.at(-1)).toMatchObject({
      tipo: "video",
      alt: "Ensayo general con la banda completa",
    });
  });

  test("una imagen sin texto alternativo → 400 y no deja archivos", async () => {
    const antes = fs.readdirSync(path.join(process.env.UPLOADS_DIR, "eventos")).length;
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", PNG);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("texto alternativo");
    expect(fs.readdirSync(path.join(process.env.UPLOADS_DIR, "eventos")).length).toBe(antes);
  });

  test("un archivo de tipo inválido → 400 con mensaje claro", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", Buffer.from("hola"), { filename: "notas.txt", contentType: "text/plain" })
      .field("alts", "x");
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("Tipo de archivo no permitido");
  });

  test("más de 6 archivos o campo equivocado → 400 (MulterError traducido)", async () => {
    let req = request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA));
    for (let i = 0; i < 7; i++) req = req.attach("archivos", PNG).field("alts", `alt ${i}`);
    const muchos = await req;
    expect(muchos.status).toBe(400);
    expect(muchos.body.message).toContain("como máximo 6");

    const otroCampo = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("foto", PNG);
    expect(otroCampo.status).toBe(400);
    expect(otroCampo.body.message).toContain('"archivos"');
  });

  test("sin archivos → 400", async () => {
    const res = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .field("alts", "x");
    expect(res.status).toBe(400);
  });

  test("DELETE quita el archivo del evento y del disco", async () => {
    const subido = await request(app)
      .post(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .attach("archivos", PNG)
      .field("alts", "Para borrar");
    const ruta = subido.body.multimedia.at(-1).ruta;
    const res = await request(app)
      .delete(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .send({ ruta });
    expect(res.status).toBe(200);
    expect(res.body.multimedia.map((m) => m.ruta)).not.toContain(ruta);
    expect(fs.existsSync(path.join(process.env.UPLOADS_DIR, "eventos", path.basename(ruta)))).toBe(
      false,
    );

    const otraVez = await request(app)
      .delete(`/api/eventos/${evento.id}/multimedia`)
      .set(await auth(LUCIA))
      .send({ ruta });
    expect(otraVez.status).toBe(404);
  });

  test("quitar una imagen de la semilla no borra el archivo compartido", async () => {
    const jazz = await eventoSemilla("jazz");
    const ruta = jazz.multimedia[0].ruta;
    const res = await request(app)
      .delete(`/api/eventos/${jazz.id}/multimedia`)
      .set(await auth(LUCIA))
      .send({ ruta });
    expect(res.status).toBe(200);
    expect(fs.existsSync(path.join(process.env.UPLOADS_DIR, "semilla", "recitales.png"))).toBe(
      true,
    );
  });
});

describe("GET /api/eventos/mios y /:id/resenias", () => {
  test("mis eventos (activos y anteriores) con conteo de compras por estado", async () => {
    const res = await request(app)
      .get("/api/eventos/mios")
      .set(await auth(LUCIA));
    expect(res.status).toBe(200);
    const nombres = res.body.map((e) => e.nombre);
    expect(nombres).toEqual(
      expect.arrayContaining(["Noche de Jazz en el Sótano", "Recital Acústico de Otoño"]),
    );
    const jazz = res.body.find((e) => e.nombre === "Noche de Jazz en el Sótano");
    expect(jazz.comprasPorEstado).toEqual({
      PENDIENTE: 0,
      CONFIRMADA: 1,
      UTILIZADA: 0,
      CANCELADA: 0,
      REEMBOLSADA: 0,
    });
    expect(jazz.tiposEntrada.find((t) => t.nombre === "VIP")).toMatchObject({
      vendidas: 2,
      disponibles: 18,
    });
    expect(jazz.reembolsosPendientes).toEqual({ cantidad: 0, proximoVencimiento: null });
    // Primavera: Bruno canceló una compra pagada hace 5 h → 1 reembolso por hacer (vence en ~19 h).
    const primavera = res.body.find((e) => e.nombre === "Festival Primavera Sonora");
    expect(primavera.reembolsosPendientes.cantidad).toBe(1);
    const horas =
      (Date.parse(primavera.reembolsosPendientes.proximoVencimiento) - Date.now()) / 3600000;
    expect(horas).toBeGreaterThan(18);
    expect(horas).toBeLessThan(20);
    expect(sinCamposInternos(res.body)).toBe(true);
    expect(
      (
        await request(app)
          .get("/api/eventos/mios")
          .set(await auth(ANA))
      ).status,
    ).toBe(403);
  });

  test("reseñas de todos los eventos del organizador, con el nombre del evento", async () => {
    const jazz = await eventoSemilla("jazz");
    const res = await request(app).get(`/api/eventos/${jazz.id}/resenias`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, pagina: 1, limite: 10 });
    expect(res.body.organizador).toMatchObject({ nombre: "Lucía Ferrari", puntajePromedio: 5 });
    expect(res.body.items[0]).toMatchObject({
      puntuacion: 5,
      compradorNombre: "Ana Gómez",
      evento: { nombre: "Recital Acústico de Otoño" },
    });
    expect(sinCamposInternos(res.body)).toBe(true);
    expect((await request(app).get(`/api/eventos/${jazz.id}/resenias?limite=0`)).status).toBe(400);
  });
});
