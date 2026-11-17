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

const ANA = "ana@ticketit.test";
const BRUNO = "bruno@ticketit.test";
const CARLA = "carla@ticketit.test";
const DIEGO = "diego@ticketit.test";
const cat = {};

const nombres = (body) => body.items.map((e) => e.nombre);

beforeAll(async () => {
  await prepararApiConSemilla();
  for (const c of await categoriasRepository.listar()) cat[c.nombre] = c.id;
});
afterAll(cerrarApi);

describe("Favoritos", () => {
  test("GET lista los favoritos, incluso los anteriores, con yaOcurrio", async () => {
    const res = await request(app)
      .get("/api/favoritos")
      .set(await auth(ANA));
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
    expect(res.body[0].nombre).toBe("Festival Primavera Sonora"); // el último marcado primero
    const acustico = res.body.find((e) => e.nombre === "Recital Acústico de Otoño");
    expect(acustico).toMatchObject({ yaOcurrio: true, finalizado: true, esFavorito: true });
    expect(res.body.every((e) => e.esFavorito)).toBe(true);
    expect(sinCamposInternos(res.body)).toBe(true);
  });

  test("PUT y DELETE son idempotentes y devuelven la lista de ids", async () => {
    const hamlet = await eventoSemilla("hamlet");
    const headers = await auth(DIEGO);
    const put1 = await request(app).put(`/api/favoritos/${hamlet.id}`).set(headers);
    const put2 = await request(app).put(`/api/favoritos/${hamlet.id}`).set(headers);
    expect(put1.status).toBe(200);
    expect(put1.body).toEqual({ favoritos: [hamlet.id] });
    expect(put2.body).toEqual({ favoritos: [hamlet.id] });

    const del1 = await request(app).delete(`/api/favoritos/${hamlet.id}`).set(headers);
    const del2 = await request(app).delete(`/api/favoritos/${hamlet.id}`).set(headers);
    expect(del1.body).toEqual({ favoritos: [] });
    expect(del2.status).toBe(200);
    expect(del2.body).toEqual({ favoritos: [] });
  });

  test("se puede marcar un evento finalizado; uno inexistente → 404; id inválido → 400", async () => {
    const maraton = await eventoSemilla("maraton");
    const headers = await auth(CARLA);
    expect((await request(app).put(`/api/favoritos/${maraton.id}`).set(headers)).status).toBe(200);
    expect(
      (await request(app).put("/api/favoritos/64a5f2c1e4b0a1b2c3d4ffff").set(headers)).status,
    ).toBe(404);
    expect((await request(app).put("/api/favoritos/xyz").set(headers)).status).toBe(400);
    await request(app).delete(`/api/favoritos/${maraton.id}`).set(headers);
  });

  test("solo compradores: organizador → 403; sin sesión → 401", async () => {
    expect(
      (
        await request(app)
          .get("/api/favoritos")
          .set(await auth("lucia@ticketit.test"))
      ).status,
    ).toBe(403);
    expect((await request(app).get("/api/favoritos")).status).toBe(401);
  });

  test("el detalle de un evento indica esFavorito con sesión de comprador", async () => {
    const jazz = await eventoSemilla("jazz");
    const ana = await request(app)
      .get(`/api/eventos/${jazz.id}`)
      .set(await auth(ANA));
    const diego = await request(app)
      .get(`/api/eventos/${jazz.id}`)
      .set(await auth(DIEGO));
    expect(ana.body.esFavorito).toBe(true);
    expect(diego.body.esFavorito).toBe(false);
  });
});

describe("GET /api/eventos/recomendados", () => {
  test("categorías preferidas, excluye favoritos y compras activas", async () => {
    const res = await request(app)
      .get("/api/eventos/recomendados")
      .set(await auth(ANA));
    expect(res.status).toBe(200);
    // Ana: 4 favoritos de Recitales (uno ya pasó) y 1 de Festivales. Jazz, Rock, Folklore y
    // Primavera ya son favoritos; Food Trucks es lo único nuevo de esas categorías.
    expect(res.body).toMatchObject({
      categorias: [
        { id: cat.Recitales, nombre: "Recitales", cantidad: 4 },
        { id: cat.Festivales, nombre: "Festivales", cantidad: 1 },
      ],
      motivo: "Porque guardaste eventos de Recitales y Festivales",
      sinFavoritos: false,
      total: 1,
    });
    expect(nombres(res.body)).toEqual(["Feria de Food Trucks y Música"]);
    expect(res.body.items[0].esFavorito).toBe(false);
  });

  test("excluye lo que ya compró aunque no sea favorito", async () => {
    // Bruno: favoritos de Stand-up (Risas, Estrenos) y Teatro (Hamlet). Compró Risas y Estrenos.
    const res = await request(app)
      .get("/api/eventos/recomendados")
      .set(await auth(BRUNO));
    expect(res.body.categorias.map((c) => c.nombre)).toEqual(["Stand-up", "Teatro"]);
    expect(nombres(res.body)).toEqual(["La Casa de Bernarda Alba"]);
  });

  test("sin favoritos → estado vacío, no error", async () => {
    const res = await request(app)
      .get("/api/eventos/recomendados")
      .set(await auth(DIEGO));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [],
      total: 0,
      pagina: 1,
      limite: 10,
      categorias: [],
      motivo: null,
      sinFavoritos: true,
    });
  });

  test("solo compradores", async () => {
    expect(
      (
        await request(app)
          .get("/api/eventos/recomendados")
          .set(await auth("lucia@ticketit.test"))
      ).status,
    ).toBe(403);
    expect((await request(app).get("/api/eventos/recomendados")).status).toBe(401);
  });
});

describe("Buscador con paraVos=true", () => {
  const buscar = async (query, email) => {
    const req = request(app)
      .get("/api/eventos")
      .query({ paraVos: "true", ...query });
    const res = email ? await req.set(await auth(email)) : await req;
    expect(res.status).toBe(200);
    return res.body;
  };

  test("reemplaza las categorías por las preferidas", async () => {
    const body = await buscar({ limite: 50 }, ANA);
    expect(body.filtrosAplicados.paraVos).toBe(true);
    expect(body.items.every((e) => ["Recitales", "Festivales"].includes(e.categoria.nombre))).toBe(
      true,
    );
    expect(body.total).toBe(5);
  });

  test("combinado con q y con precio", async () => {
    expect(nombres(await buscar({ q: "noche" }, ANA))).toEqual(["Noche de Jazz en el Sótano"]);
    expect(nombres(await buscar({ precioMax: 15000 }, ANA))).toEqual([
      "Folklore bajo las estrellas",
      "Feria de Food Trucks y Música",
    ]);
  });

  test("orden relevancia: primero la categoría con más peso, después la fecha", async () => {
    const body = await buscar({ orden: "relevancia", limite: 50 }, ANA);
    const categorias = body.items.map((e) => e.categoria.nombre);
    expect(categorias).toEqual(["Recitales", "Recitales", "Recitales", "Festivales", "Festivales"]);
    expect(nombres(body).slice(0, 3)).toEqual([
      "Folklore bajo las estrellas",
      "Noche de Jazz en el Sótano",
      "Rock Nacional: Clásicos en vivo",
    ]);
  });

  test("con categoriaIds aplica la intersección", async () => {
    const solo = await buscar({ categoriaIds: cat.Festivales }, ANA);
    expect(solo.items.every((e) => e.categoria.nombre === "Festivales")).toBe(true);
    expect(solo.total).toBe(2);
    const vacia = await buscar({ categoriaIds: cat.Teatro }, ANA);
    expect(vacia).toMatchObject({ total: 0, items: [] });
    expect(vacia.filtrosAplicados.categoriaIds).toEqual([]);
  });

  test("sin sesión, sin favoritos o sin ser comprador se ignora (y relevancia cae a fecha)", async () => {
    for (const email of [undefined, DIEGO, "lucia@ticketit.test"]) {
      const body = await buscar({ orden: "relevancia", limite: 50 }, email);
      expect(body.filtrosAplicados).toMatchObject({ paraVos: false, orden: "fecha" });
      expect(body.total).toBe(13);
    }
  });
});
