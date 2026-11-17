import {
  categoriasRepository,
  comprasRepository,
  comprasService,
  notificacionesRepository,
  notificacionesService,
  usuariosRepository,
} from "../dependencias.js";
import {
  app,
  auth,
  avanzarReloj,
  cerrarApi,
  eventoSemilla,
  prepararApiConSemilla,
  request,
  restaurarReloj,
  sinCamposInternos,
} from "./helpers/apiSemilla.js";

const HORA = 60 * 60 * 1000;
const ANA = "ana@ticketit.test";
const BRUNO = "bruno@ticketit.test";
const LUCIA = "lucia@ticketit.test";
const MARTIN = "martin@ticketit.test";

let categoriaId;
const ids = {};

async function compraDeSemilla(claveEvento, email) {
  const evento = await eventoSemilla(claveEvento);
  const compras = await comprasRepository.listarPorEvento(evento.id);
  return compras.find((c) => c.compradorId === ids[email]);
}

/** Notificaciones de un usuario para una compra (las más nuevas primero). */
async function notificacionesDe(email, compraId) {
  const { items } = await notificacionesRepository.listarPorDestinatario(ids[email], {
    limite: 50,
  });
  return items.filter((n) => !compraId || n.datos.compraId === compraId);
}

async function eventoDeLucia(enHoras = 72) {
  const res = await request(app)
    .post("/api/eventos")
    .set(await auth(LUCIA))
    .send({
      nombre: `Evento notificaciones ${Math.random().toString(36).slice(2, 8)}`,
      descripcion: "Para probar avisos",
      categoriaId,
      fecha: new Date(Date.now() + enHoras * HORA).toISOString(),
      lugar: "Sala de Tests",
      tiposEntrada: [{ nombre: "General", precio: 1000, cupo: 10 }],
    });
  return res.body;
}

async function compraDeAna(evento) {
  const res = await request(app)
    .post("/api/compras")
    .set(await auth(ANA))
    .send({ eventoId: evento.id, tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 2 });
  expect(res.status).toBe(201);
  return res.body;
}

const accion = async (email, compra, nombre) =>
  request(app)
    .post(`/api/compras/${compra.id}/${nombre}`)
    .set(await auth(email));

beforeAll(async () => {
  await prepararApiConSemilla();
  categoriaId = (await categoriasRepository.obtenerPorNombre("Recitales")).id;
  for (const email of [ANA, BRUNO, LUCIA, MARTIN]) {
    ids[email] = (await usuariosRepository.obtenerPorEmail(email)).id;
  }
});
afterEach(restaurarReloj);
afterAll(cerrarApi);

describe("Chat REST", () => {
  test("un participante lee los mensajes y los marca como leídos", async () => {
    const compra = await compraDeSemilla("jazz", ANA);
    const res = await request(app)
      .get(`/api/compras/${compra.id}/mensajes`)
      .set(await auth(ANA));
    expect(res.status).toBe(200);
    expect(res.body.mensajes.map((m) => m.rol)).toEqual(["COMPRADOR", "ORGANIZADOR"]);
    expect(res.body.mensajesNoLeidos).toBe(1);
    expect(sinCamposInternos(res.body)).toBe(true);

    const leidos = await request(app)
      .post(`/api/compras/${compra.id}/mensajes/leidos`)
      .set(await auth(ANA));
    expect(leidos.status).toBe(200);
    expect(leidos.body.mensajesNoLeidos).toBe(0);
    const mias = await request(app)
      .get("/api/compras/mias")
      .set(await auth(ANA));
    expect(mias.body.find((c) => c.id === compra.id).mensajesNoLeidos).toBe(0);
  });

  test("enviar: 201, el otro lo ve con ?desde y recibe NUEVO_MENSAJE", async () => {
    const compra = await compraDeSemilla("jazz", ANA);
    const antes = (await notificacionesDe(LUCIA, compra.id)).length;
    const enviado = await request(app)
      .post(`/api/compras/${compra.id}/mensajes`)
      .set(await auth(ANA))
      .send({ mensaje: "  ¡Gracias! Nos vemos ahí.  " });
    expect(enviado.status).toBe(201);
    expect(enviado.body).toMatchObject({
      mensaje: "¡Gracias! Nos vemos ahí.",
      rol: "COMPRADOR",
      usuarioNombre: "Ana Gómez",
    });

    const desde = new Date(Date.parse(enviado.body.enviado) - 1).toISOString();
    const nuevos = await request(app)
      .get(`/api/compras/${compra.id}/mensajes`)
      .query({ desde })
      .set(await auth(LUCIA));
    expect(nuevos.body.mensajes.map((m) => m.mensaje)).toEqual(["¡Gracias! Nos vemos ahí."]);
    expect(nuevos.body.mensajesNoLeidos).toBe(1);

    const despues = await notificacionesDe(LUCIA, compra.id);
    expect(despues).toHaveLength(antes + 1);
    expect(despues[0]).toMatchObject({ tipo: "NUEVO_MENSAJE", leida: false });
    expect(despues[0].mensaje).toContain(
      'Ana Gómez te escribió sobre "Noche de Jazz en el Sótano"',
    );
  });

  test("un tercero → 403; compra inexistente → 404", async () => {
    const compra = await compraDeSemilla("jazz", ANA);
    for (const email of [BRUNO, MARTIN]) {
      expect(
        (
          await request(app)
            .get(`/api/compras/${compra.id}/mensajes`)
            .set(await auth(email))
        ).status,
      ).toBe(403);
      const post = await request(app)
        .post(`/api/compras/${compra.id}/mensajes`)
        .set(await auth(email))
        .send({ mensaje: "hola" });
      expect(post.status).toBe(403);
    }
    expect(
      (
        await request(app)
          .get("/api/compras/64a5f2c1e4b0a1b2c3d4ffff/mensajes")
          .set(await auth(ANA))
      ).status,
    ).toBe(404);
    expect((await request(app).get(`/api/compras/${compra.id}/mensajes`)).status).toBe(401);
  });

  test.each([
    [{ mensaje: "   " }, "vacío"],
    [{ mensaje: "x".repeat(1001) }, "1000"],
    [{ mensaje: "hola", urgente: true }, "urgente"],
    [{}, "mensaje"],
  ])("mensaje inválido %p → 400", async (body, texto) => {
    const compra = await compraDeSemilla("jazz", ANA);
    const res = await request(app)
      .post(`/api/compras/${compra.id}/mensajes`)
      .set(await auth(ANA))
      .send(body);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain(texto);
  });

  test("se puede escribir en una compra CANCELADA o UTILIZADA", async () => {
    const cancelada = await compraDeSemilla("hamlet", ANA);
    expect(cancelada.estado).toBe("CANCELADA");
    const res = await request(app)
      .post(`/api/compras/${cancelada.id}/mensajes`)
      .set(await auth(ANA))
      .send({ mensaje: "¿Vuelven a hacer funciones?" });
    expect(res.status).toBe(201);
    const respuesta = await request(app)
      .post(`/api/compras/${cancelada.id}/mensajes`)
      .set(await auth(MARTIN))
      .send({ mensaje: "Sí, en marzo." });
    expect(respuesta.status).toBe(201);
  });
});

describe("Notificaciones por cada transición", () => {
  test("crear, pagar, cancelar y reembolsar", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraDeAna(evento);
    expect((await notificacionesDe(LUCIA, compra.id)).map((n) => n.tipo)).toEqual(["NUEVA_COMPRA"]);

    await accion(ANA, compra, "pagar");
    expect((await notificacionesDe(ANA, compra.id)).map((n) => n.tipo)).toEqual([
      "COMPRA_CONFIRMADA",
    ]);
    expect((await notificacionesDe(LUCIA, compra.id))[0]).toMatchObject({
      tipo: "COMPRA_CONFIRMADA",
    });
    expect((await notificacionesDe(LUCIA, compra.id))[0].mensaje).toContain("Ana Gómez pagó");

    await accion(ANA, compra, "cancelar");
    const cancelada = (await notificacionesDe(LUCIA, compra.id))[0];
    expect(cancelada.tipo).toBe("COMPRA_CANCELADA");
    expect(cancelada.mensaje).toMatch(
      /Tenés que reembolsar \$2\.000,00 antes del \d{2}\/\d{2}\/\d{4}/,
    );

    await accion(LUCIA, compra, "reembolsar");
    const reembolso = (await notificacionesDe(ANA, compra.id))[0];
    expect(reembolso.tipo).toBe("REEMBOLSO_REALIZADO");
    expect(reembolso.mensaje).toContain("El organizador te reembolsó $2.000,00");
    expect(reembolso.datos).toEqual({ compraId: compra.id, eventoId: evento.id });
  });

  test("cancelar sin pagar avisa que no hay nada que reembolsar", async () => {
    const compra = await compraDeAna(await eventoDeLucia());
    await accion(ANA, compra, "cancelar");
    expect((await notificacionesDe(LUCIA, compra.id))[0].mensaje).toContain("nada que reembolsar");
  });

  test("vencida, reembolso automático, utilizada y reseña", async () => {
    const vence = await compraDeAna(await eventoDeLucia(96));
    const reembolsa = await compraDeAna(await eventoDeLucia(96));
    await accion(ANA, reembolsa, "pagar");
    await accion(ANA, reembolsa, "cancelar");
    const usada = await compraDeAna(await eventoDeLucia(49));
    await accion(ANA, usada, "pagar");

    await avanzarReloj(50 * HORA);
    await comprasService.vencerComprasPendientes();
    await comprasService.reembolsosAutomaticos();
    await comprasService.marcarComprasUtilizadas();

    expect((await notificacionesDe(ANA, vence.id))[0].tipo).toBe("COMPRA_VENCIDA");
    const auto = (await notificacionesDe(ANA, reembolsa.id))[0];
    expect(auto.tipo).toBe("REEMBOLSO_REALIZADO");
    expect(auto.mensaje).toContain("reembolso automático");
    expect((await notificacionesDe(ANA, usada.id))[0].tipo).toBe("ENTRADA_UTILIZADA");

    await request(app)
      .post(`/api/compras/${usada.id}/resenia`)
      .set(await auth(ANA))
      .send({ puntuacion: 4.5 });
    const resenia = (await notificacionesDe(LUCIA, usada.id))[0];
    expect(resenia.tipo).toBe("NUEVA_RESENIA");
    expect(resenia.mensaje).toContain("Ana Gómez calificó");
  });

  test("recordatorio 24 h antes del evento, una sola vez", async () => {
    const compra = await compraDeAna(await eventoDeLucia(30));
    await accion(ANA, compra, "pagar");
    expect(await comprasService.recordarEventosProximos()).toBe(0); // faltan 30 h

    await avanzarReloj(7 * HORA);
    expect(await comprasService.recordarEventosProximos()).toBeGreaterThanOrEqual(1);
    const recordatorio = (await notificacionesDe(ANA, compra.id))[0];
    expect(recordatorio.tipo).toBe("RECORDATORIO_EVENTO");
    expect(recordatorio.mensaje).toContain("Sala de Tests");

    await comprasService.recordarEventosProximos();
    const recordatorios = (await notificacionesDe(ANA, compra.id)).filter(
      (n) => n.tipo === "RECORDATORIO_EVENTO",
    );
    expect(recordatorios).toHaveLength(1);
    expect((await comprasRepository.obtenerPorId(compra.id)).recordatorioEnviado).toBe(true);
  });
});

describe("REST /api/notificaciones", () => {
  test("listar, contar, marcar una y marcar todas", async () => {
    const headers = await auth(BRUNO);
    const cantidad = await request(app).get("/api/notificaciones/no-leidas/cantidad").set(headers);
    expect(cantidad.status).toBe(200);
    expect(cantidad.body.cantidad).toBeGreaterThan(0);

    const lista = await request(app)
      .get("/api/notificaciones?soloNoLeidas=true&limite=5")
      .set(headers);
    expect(lista.status).toBe(200);
    expect(lista.body).toMatchObject({ pagina: 1, limite: 5, total: cantidad.body.cantidad });
    expect(lista.body.items.every((n) => n.leida === false)).toBe(true);
    expect(lista.body.items[0]).toEqual({
      id: expect.any(String),
      tipo: expect.any(String),
      titulo: expect.any(String),
      mensaje: expect.any(String),
      datos: expect.any(Object),
      fecha: expect.any(String),
      leida: false,
    });
    expect(sinCamposInternos(lista.body)).toBe(true);

    const [primera] = lista.body.items;
    const marcada = await request(app)
      .patch(`/api/notificaciones/${primera.id}/leida`)
      .set(headers);
    expect(marcada.status).toBe(200);
    expect(marcada.body.leida).toBe(true);

    const todas = await request(app).patch("/api/notificaciones/leidas").set(headers);
    expect(todas.body.actualizadas).toBe(cantidad.body.cantidad - 1);
    expect(
      (await request(app).get("/api/notificaciones/no-leidas/cantidad").set(headers)).body.cantidad,
    ).toBe(0);
  });

  test("solo el destinatario puede marcarla (403); inexistente → 404; id inválido → 400", async () => {
    const { items } = await notificacionesRepository.listarPorDestinatario(ids[LUCIA]);
    const ajena = await request(app)
      .patch(`/api/notificaciones/${items[0].id}/leida`)
      .set(await auth(ANA));
    expect(ajena.status).toBe(403);
    const inexistente = await request(app)
      .patch("/api/notificaciones/64a5f2c1e4b0a1b2c3d4ffff/leida")
      .set(await auth(ANA));
    expect(inexistente.status).toBe(404);
    expect(
      (
        await request(app)
          .patch("/api/notificaciones/xyz/leida")
          .set(await auth(ANA))
      ).status,
    ).toBe(400);
    expect((await request(app).get("/api/notificaciones")).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/notificaciones?soloNoLeidas=quizas")
          .set(await auth(ANA))
      ).status,
    ).toBe(400);
  });
});

describe("Bandeja de conversaciones (GET /api/compras/conversaciones)", () => {
  const enviar = async (email, compraId, mensaje) =>
    request(app)
      .post(`/api/compras/${compraId}/mensajes`)
      .set(await auth(email))
      .send({ mensaje });
  const bandeja = async (email, query = "") =>
    request(app)
      .get(`/api/compras/conversaciones${query}`)
      .set(await auth(email));

  test("solo compras con mensajes, por último mensaje, con no leídos y total", async () => {
    const evento = await eventoDeLucia();
    const vieja = await compraDeAna(evento);
    const nueva = await compraDeAna(evento);
    await compraDeAna(evento); // sin mensajes: no aparece

    await enviar(ANA, vieja.id, "Hola, ¿hay estacionamiento?");
    await avanzarReloj(60 * 1000);
    await enviar(LUCIA, nueva.id, "Gracias por tu compra");
    await avanzarReloj(60 * 1000);
    await enviar(LUCIA, nueva.id, "Abrimos a las 20 h");

    const deAna = await bandeja(ANA);
    expect(deAna.status).toBe(200);
    const propias = deAna.body.items.filter((i) => [vieja.id, nueva.id].includes(i.compraId));
    expect(propias.map((i) => i.compraId)).toEqual([nueva.id, vieja.id]);
    expect(propias[0]).toMatchObject({
      estado: "PENDIENTE",
      evento: { id: evento.id, nombre: evento.nombre },
      otro: { rol: "ORGANIZADOR", nombre: "Lucía" },
      ultimoMensaje: { mensaje: "Abrimos a las 20 h", rol: "ORGANIZADOR" },
      mensajesNoLeidos: 2,
    });
    expect(propias[1].mensajesNoLeidos).toBe(0);
    expect(deAna.body.totalNoLeidos).toBeGreaterThanOrEqual(2);

    const deLucia = await bandeja(LUCIA, "?limite=50");
    const vistaLucia = deLucia.body.items.find((i) => i.compraId === vieja.id);
    expect(vistaLucia).toMatchObject({ otro: { rol: "COMPRADOR" }, mensajesNoLeidos: 1 });

    const antes = deAna.body.totalNoLeidos;
    await request(app)
      .post(`/api/compras/${nueva.id}/mensajes/leidos`)
      .set(await auth(ANA));
    expect((await bandeja(ANA)).body.totalNoLeidos).toBe(antes - 2);
  });

  test("paginada; sin sesión → 401; parámetro desconocido → 400", async () => {
    const pagina = await bandeja(ANA, "?pagina=1&limite=1");
    expect(pagina.body.items).toHaveLength(1);
    expect(pagina.body.total).toBeGreaterThanOrEqual(2);
    expect((await request(app).get("/api/compras/conversaciones")).status).toBe(401);
    expect((await bandeja(ANA, "?foo=1")).status).toBe(400);
  });

  test("un usuario sin conversaciones recibe la bandeja vacía", async () => {
    const registro = await request(app).post("/api/auth/registro").send({
      nombre: "Nora",
      apellido: "Paz",
      email: "nora.bandeja@test.com",
      password: "unaClaveLarga",
      rol: "COMPRADOR",
    });
    const res = await request(app)
      .get("/api/compras/conversaciones")
      .set("Authorization", `Bearer ${registro.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 0, totalNoLeidos: 0, items: [] });
  });
});

describe("Avisos de mensajes leídos al abrir el chat", () => {
  test("POST /leidos marca leídos los NUEVO_MENSAJE de esa compra y no los de otras", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraDeAna(evento);
    const otra = await compraDeAna(evento);
    const escribir = async (compraId, mensaje) =>
      request(app)
        .post(`/api/compras/${compraId}/mensajes`)
        .set(await auth(LUCIA))
        .send({ mensaje });
    await escribir(compra.id, "Hola Ana");
    await escribir(compra.id, "¿Te llegó la entrada?");
    await escribir(otra.id, "Otro tema");

    const avisos = async (compraId) =>
      (await notificacionesDe(ANA, compraId)).filter((n) => n.tipo === "NUEVO_MENSAJE");
    expect((await avisos(compra.id)).map((n) => n.leida)).toEqual([false, false]);

    const res = await request(app)
      .post(`/api/compras/${compra.id}/mensajes/leidos`)
      .set(await auth(ANA));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ mensajesNoLeidos: 0, notificacionesLeidas: 2 });
    expect((await avisos(compra.id)).every((n) => n.leida)).toBe(true);
    expect((await avisos(otra.id)).map((n) => n.leida)).toEqual([false]);

    // Otras notificaciones de la misma compra (por ejemplo, la de la compra creada) no se tocan.
    expect((await notificacionesDe(LUCIA, compra.id)).some((n) => !n.leida)).toBe(true);
  });
});

describe("Limpiar notificaciones (DELETE /api/notificaciones)", () => {
  test("baja lógica: dejan de listarse y contarse, con auditoría; las nuevas siguen llegando", async () => {
    const CARLA = "carla@ticketit.test";
    const headers = await auth(CARLA);
    const carlaId = (await usuariosRepository.obtenerPorEmail(CARLA)).id;
    const antes = await request(app).get("/api/notificaciones?limite=50").set(headers);
    expect(antes.body.total).toBeGreaterThan(0);

    const res = await request(app).delete("/api/notificaciones").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.eliminadas).toBe(antes.body.total);

    const despues = await request(app).get("/api/notificaciones").set(headers);
    expect(despues.body).toMatchObject({ total: 0, items: [] });
    expect(
      (await request(app).get("/api/notificaciones/no-leidas/cantidad").set(headers)).body.cantidad,
    ).toBe(0);

    const enBase = await notificacionesRepository.model
      .find({ destinatarioId: carlaId })
      .incluirInactivos()
      .lean();
    expect(enBase).toHaveLength(antes.body.total);
    expect(enBase.every((n) => n.activo === false && n.modificadoPor === carlaId)).toBe(true);
    expect(enBase.every((n) => n.fechaModificacion instanceof Date)).toBe(true);

    // Una baja ya hecha no cuenta otra vez; una notificación nueva sí aparece.
    expect((await request(app).delete("/api/notificaciones").set(headers)).body.eliminadas).toBe(0);
    await notificacionesService.notificar("ENTRADA_UTILIZADA", carlaId, { evento: "Prueba" });
    expect((await request(app).get("/api/notificaciones").set(headers)).body.total).toBe(1);
  });

  test("solo limpia las propias; sin sesión → 401; con body → 400", async () => {
    const deBruno = (
      await request(app)
        .get("/api/notificaciones")
        .set(await auth(BRUNO))
    ).body.total;
    await request(app)
      .delete("/api/notificaciones")
      .set(await auth(MARTIN));
    expect(
      (
        await request(app)
          .get("/api/notificaciones")
          .set(await auth(BRUNO))
      ).body.total,
    ).toBe(deBruno);
    expect((await request(app).delete("/api/notificaciones")).status).toBe(401);
    expect(
      (
        await request(app)
          .delete("/api/notificaciones")
          .set(await auth(BRUNO))
          .send({ todas: true })
      ).status,
    ).toBe(400);
  });
});
