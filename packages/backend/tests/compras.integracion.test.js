import { jest } from "@jest/globals";
import { categoriasRepository, comprasService, eventosRepository } from "../dependencias.js";
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

/** Evento nuevo de Lucía a `enHoras` desde ahora (real), con dos tipos de entrada. */
async function eventoDeLucia(enHoras = 72, { cupoGeneral = 10 } = {}) {
  const res = await request(app)
    .post("/api/eventos")
    .set(await auth(LUCIA))
    .send({
      nombre: `Evento de prueba ${Math.random().toString(36).slice(2, 8)}`,
      descripcion: "Para probar compras",
      categoriaId,
      fecha: new Date(Date.now() + enHoras * HORA).toISOString(),
      lugar: "Sala de Tests",
      tiposEntrada: [
        { nombre: "General", precio: 1500.5, cupo: cupoGeneral },
        { nombre: "VIP", precio: 4000, cupo: 4 },
      ],
    });
  expect(res.status).toBe(201);
  return res.body;
}

async function comprar(email, evento, { tipo = 0, cantidad = 2 } = {}) {
  return request(app)
    .post("/api/compras")
    .set(await auth(email))
    .send({ eventoId: evento.id, tipoEntradaId: evento.tiposEntrada[tipo].id, cantidad });
}

async function compraHecha(email, evento, opciones) {
  const res = await comprar(email, evento, opciones);
  expect(res.status).toBe(201);
  return res.body;
}

const accion = async (email, compra, nombre) =>
  request(app)
    .post(`/api/compras/${compra.id}/${nombre}`)
    .set(await auth(email));

const detalle = async (email, compra) =>
  request(app)
    .get(`/api/compras/${compra.id}`)
    .set(await auth(email));

async function disponibles(eventoId) {
  const evento = await eventosRepository.obtenerPorId(eventoId, { incluirInactivos: true });
  return evento.tiposEntrada.map((t) => t.disponibles);
}

async function puntajeDeLucia() {
  const res = await request(app)
    .get("/api/auth/me")
    .set(await auth(LUCIA));
  return res.body;
}

beforeAll(async () => {
  await prepararApiConSemilla();
  categoriaId = (await categoriasRepository.obtenerPorNombre("Recitales")).id;
});
afterEach(restaurarReloj);
afterAll(cerrarApi);

describe("Flujo feliz por API", () => {
  test("crear → pagar → (pasa el evento) UTILIZADA → reseña → puntaje del organizador", async () => {
    const evento = await eventoDeLucia(72);
    const antes = await puntajeDeLucia();

    const compra = await compraHecha(ANA, evento, { tipo: 0, cantidad: 3 });
    expect(compra).toMatchObject({
      estado: "PENDIENTE",
      cantidad: 3,
      precioUnitario: 1500.5,
      total: 4501.5,
      acciones: {
        puedePagar: true,
        puedeCancelar: true,
        puedeReseniar: false,
        puedeReembolsar: false,
      },
    });
    expect(Date.parse(compra.fechaLimitePago) - Date.parse(compra.fechaCompra)).toBe(48 * HORA);
    expect(compra.historial).toEqual([
      expect.objectContaining({
        estadoAnterior: null,
        estadoNuevo: "PENDIENTE",
        quien: { id: expect.any(String), nombre: "Ana Gómez", rol: "COMPRADOR" },
        detalle: "Compra de 3 × General por $4.501,50",
      }),
    ]);
    expect(await disponibles(evento.id)).toEqual([7, 4]);
    expect(sinCamposInternos(compra)).toBe(true);

    const pagada = await accion(ANA, compra, "pagar");
    expect(pagada.status).toBe(200);
    expect(pagada.body).toMatchObject({
      estado: "CONFIRMADA",
      diasParaElEvento: 3,
      fechaLimitePago: null,
    });
    expect(pagada.body.historial[1]).toMatchObject({
      estadoAnterior: "PENDIENTE",
      estadoNuevo: "CONFIRMADA",
      quien: { nombre: "Ana Gómez", rol: "COMPRADOR" },
      detalle: "Pago confirmado por $4.501,50",
    });

    await avanzarReloj(72 * HORA);
    const usada = await detalle(ANA, compra);
    expect(usada.body.estado).toBe("UTILIZADA");
    expect(usada.body.historial[2]).toMatchObject({
      estadoAnterior: "CONFIRMADA",
      estadoNuevo: "UTILIZADA",
      quien: { id: "SISTEMA", nombre: "Sistema", rol: "SISTEMA" },
    });
    expect(usada.body.acciones.puedeReseniar).toBe(true);

    const resenia = await request(app)
      .post(`/api/compras/${compra.id}/resenia`)
      .set(await auth(ANA))
      .send({ puntuacion: 4, detalle: "Muy lindo" });
    expect(resenia.status).toBe(201);
    expect(resenia.body).toMatchObject({
      puntuacion: 4,
      compradorNombre: "Ana Gómez",
      evento: { id: evento.id },
    });

    const despues = await puntajeDeLucia();
    expect(despues.cantidadResenias).toBe(antes.cantidadResenias + 1);
    expect(despues.puntajePromedio).toBeCloseTo(
      (antes.puntajePromedio * antes.cantidadResenias + 4) / (antes.cantidadResenias + 1),
      2,
    );

    const conResenia = await detalle(ANA, compra);
    expect(conResenia.body.resenia).toMatchObject({ puntuacion: 4, detalle: "Muy lindo" });
    expect(conResenia.body.acciones.puedeReseniar).toBe(false);
  });
});

describe("Cancelar", () => {
  test("una PENDIENTE libera cupo y no deja reembolso", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento, { tipo: 1, cantidad: 3 });
    expect(await disponibles(evento.id)).toEqual([10, 1]);
    const res = await accion(ANA, compra, "cancelar");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: "CANCELADA",
      motivoCancelacion: "CANCELADA_POR_COMPRADOR",
      reembolsoPendiente: false,
      fechaLimiteReembolso: null,
    });
    expect(await disponibles(evento.id)).toEqual([10, 4]);
  });

  test("una CONFIRMADA libera cupo y deja el reembolso pendiente por 24 h", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "pagar");
    const res = await accion(ANA, compra, "cancelar");
    expect(res.body).toMatchObject({ estado: "CANCELADA", reembolsoPendiente: true });
    const cancelacion = res.body.historial.at(-1);
    expect(Date.parse(res.body.fechaLimiteReembolso) - Date.parse(cancelacion.fechaHora)).toBe(
      24 * HORA,
    );
    expect(await disponibles(evento.id)).toEqual([10, 4]);
  });

  test("cancelar dos veces → 409 y el cupo se libera una sola vez", async () => {
    const evento = await eventoDeLucia();
    const otra = await compraHecha(BRUNO, evento, { cantidad: 4 });
    const compra = await compraHecha(ANA, evento, { cantidad: 3 });
    await accion(ANA, compra, "cancelar");
    const otraVez = await accion(ANA, compra, "cancelar");
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.message).toBe("No se puede cancelar una compra CANCELADA");
    expect(await disponibles(evento.id)).toEqual([6, 4]);
    expect(otra.estado).toBe("PENDIENTE");
  });

  test("no se puede cancelar después de la fecha del evento", async () => {
    const evento = await eventoDeLucia(10);
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "pagar");
    await avanzarReloj(11 * HORA);
    const res = await accion(ANA, compra, "cancelar");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("No se puede cancelar una compra UTILIZADA");
  });
});

describe("Reembolsos", () => {
  async function canceladaPaga() {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "pagar");
    await accion(ANA, compra, "cancelar");
    return { evento, compra };
  }

  test("manual por el organizador", async () => {
    const { compra } = await canceladaPaga();
    const res = await accion(LUCIA, compra, "reembolsar");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: "REEMBOLSADA",
      reembolsoPendiente: false,
      acciones: { puedeReembolsar: false },
    });
    expect(res.body.historial.at(-1)).toMatchObject({
      quien: { nombre: "Lucía Ferrari", rol: "ORGANIZADOR" },
      detalle: "Reembolso de $3.001,00 realizado por el organizador",
    });
    expect((await accion(LUCIA, compra, "reembolsar")).status).toBe(409);
  });

  test("automático a las 24 h (reloj +25 h); después el organizador recibe 409", async () => {
    const { compra } = await canceladaPaga();
    await avanzarReloj(25 * HORA);
    const res = await detalle(ANA, compra);
    expect(res.body.estado).toBe("REEMBOLSADA");
    expect(res.body.historial.at(-1)).toMatchObject({
      quien: { id: "SISTEMA" },
      detalle: "Reembolso automático: el organizador no reembolsó en 24 h",
    });
    const tarde = await accion(LUCIA, compra, "reembolsar");
    expect(tarde.status).toBe(409);
    expect(tarde.body.message).toBe("La compra ya fue reembolsada automáticamente");
  });

  test("una cancelación sin pago no se reembolsa", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "cancelar");
    const res = await accion(LUCIA, compra, "reembolsar");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("La compra no tiene un reembolso pendiente");
  });
});

describe("Vencimiento", () => {
  test("a las 48 h sin pago: pagar responde 409 'La compra venció' y el cupo vuelve", async () => {
    const evento = await eventoDeLucia(5 * 24);
    const compra = await compraHecha(ANA, evento, { cantidad: 4 });
    await avanzarReloj(48 * HORA);
    const res = await accion(ANA, compra, "pagar");
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("La compra venció");
    const despues = await detalle(ANA, compra);
    expect(despues.body).toMatchObject({ estado: "CANCELADA", motivoCancelacion: "VENCIDA" });
    expect(despues.body.historial.at(-1)).toMatchObject({
      quien: { id: "SISTEMA" },
      detalle: "Vencida: 48 h sin pago",
    });
    expect(await disponibles(evento.id)).toEqual([10, 4]);
    // Volver a pagar sigue diciendo que venció.
    expect((await accion(ANA, compra, "pagar")).body.message).toBe("La compra venció");
  });

  test("si el evento ocurre antes de las 48 h, vence a la hora del evento", async () => {
    const evento = await eventoDeLucia(5);
    const compra = await compraHecha(ANA, evento);
    expect(compra.fechaLimitePago).toBe(evento.fecha);
    await avanzarReloj(5 * HORA);
    const res = await detalle(ANA, compra);
    expect(res.body).toMatchObject({ estado: "CANCELADA", motivoCancelacion: "VENCIDA" });
    expect(res.body.historial.at(-1).detalle).toBe(
      "Vencida: el evento comenzó sin que se registrara el pago",
    );
  });
});

describe("Reseñas", () => {
  test("no se puede reseñar si no está UTILIZADA, ni dos veces", async () => {
    const evento = await eventoDeLucia(2);
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "pagar");
    const enviar = async () =>
      request(app)
        .post(`/api/compras/${compra.id}/resenia`)
        .set(await auth(ANA))
        .send({ puntuacion: 5 });

    const temprano = await enviar();
    expect(temprano.status).toBe(409);
    expect(temprano.body.message).toBe("No se puede reseñar una compra CONFIRMADA");

    await avanzarReloj(3 * HORA);
    expect((await enviar()).status).toBe(201);
    const segunda = await enviar();
    expect(segunda.status).toBe(409);
    expect(segunda.body.message).toBe("Esta compra ya tiene una reseña");
  });

  test.each([
    { puntuacion: 3.3 },
    { puntuacion: 6 },
    { puntuacion: 4, extra: 1 },
    { detalle: "x" },
  ])("body inválido %p → 400", async (body) => {
    const { id } = (
      await request(app)
        .get("/api/compras/mias")
        .set(await auth(ANA))
    ).body[0];
    const res = await request(app)
      .post(`/api/compras/${id}/resenia`)
      .set(await auth(ANA))
      .send(body);
    expect(res.status).toBe(400);
  });
});

describe("Permisos", () => {
  test("otro comprador → 403 al ver u operar; el organizador del evento puede ver", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento);
    expect((await detalle(BRUNO, compra)).status).toBe(403);
    for (const nombre of ["pagar", "cancelar"]) {
      expect((await accion(BRUNO, compra, nombre)).status).toBe(403);
    }
    const resenia = await request(app)
      .post(`/api/compras/${compra.id}/resenia`)
      .set(await auth(BRUNO))
      .send({ puntuacion: 5 });
    expect(resenia.status).toBe(403);

    const organizador = await detalle(LUCIA, compra);
    expect(organizador.status).toBe(200);
    expect(organizador.body.acciones).toEqual({
      puedePagar: false,
      puedeCancelar: false,
      puedeReseniar: false,
      puedeReembolsar: false,
    });
    expect((await detalle(MARTIN, compra)).status).toBe(403);
  });

  test("otro organizador → 403 en /eventos/:id/compras y al reembolsar", async () => {
    const evento = await eventoDeLucia();
    const compra = await compraHecha(ANA, evento);
    await accion(ANA, compra, "pagar");
    await accion(ANA, compra, "cancelar");
    expect(
      (
        await request(app)
          .get(`/api/eventos/${evento.id}/compras`)
          .set(await auth(MARTIN))
      ).status,
    ).toBe(403);
    expect((await accion(MARTIN, compra, "reembolsar")).status).toBe(403);
  });

  test("roles: un organizador no compra; un comprador no reembolsa ni ve compras por evento", async () => {
    const evento = await eventoDeLucia();
    expect((await comprar(LUCIA, evento)).status).toBe(403);
    const compra = await compraHecha(ANA, evento);
    expect((await accion(ANA, compra, "reembolsar")).status).toBe(403);
    expect(
      (
        await request(app)
          .get(`/api/eventos/${evento.id}/compras`)
          .set(await auth(ANA))
      ).status,
    ).toBe(403);
    expect((await request(app).get("/api/compras/mias")).status).toBe(401);
  });
});

describe("Validaciones al comprar", () => {
  test.each([
    [{ cantidad: 0 }, 400, "mínima es 1"],
    [{ cantidad: 11 }, 400, "máxima es 10"],
    [{ precio: 1 }, 400, "precio"], // el precio nunca viene del cliente (.strict())
    [{ tipoEntradaId: "64a5f2c1e4b0a1b2c3d4ffff" }, 404, "tipo de entrada no existe"],
    [{ eventoId: "64a5f2c1e4b0a1b2c3d4ffff" }, 404, "No existe el evento"],
  ])("%p → %i", async (extra, status, texto) => {
    const evento = await eventoDeLucia();
    const res = await request(app)
      .post("/api/compras")
      .set(await auth(ANA))
      .send({
        eventoId: evento.id,
        tipoEntradaId: evento.tiposEntrada[0].id,
        cantidad: 1,
        ...extra,
      });
    expect(res.status).toBe(status);
    expect(res.body.message).toContain(texto);
  });

  test("evento que ya ocurrió → 400; sin cupo → 409", async () => {
    const acustico = await eventoSemilla("acustico");
    const pasado = await request(app)
      .post("/api/compras")
      .set(await auth(ANA))
      .send({ eventoId: acustico.id, tipoEntradaId: acustico.tiposEntrada[0].id, cantidad: 1 });
    expect(pasado.status).toBe(400);

    const evento = await eventoDeLucia();
    const sinCupo = await comprar(ANA, evento, { tipo: 1, cantidad: 5 });
    expect(sinCupo.status).toBe(409);
  });

  test("sin sobreventa con 20 compras concurrentes sobre cupo 5", async () => {
    const evento = await eventoDeLucia(72, { cupoGeneral: 5 });
    const headers = await auth(ANA);
    const respuestas = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app)
          .post("/api/compras")
          .set(headers)
          .send({ eventoId: evento.id, tipoEntradaId: evento.tiposEntrada[0].id, cantidad: 1 }),
      ),
    );
    const estados = respuestas.map((r) => r.status);
    expect(estados.filter((s) => s === 201)).toHaveLength(5);
    expect(estados.filter((s) => s === 409)).toHaveLength(15);
    expect(await disponibles(evento.id)).toEqual([0, 4]);
  });
});

describe("Mis compras", () => {
  test("próximas primero, con acciones, días y mensajes no leídos", async () => {
    const res = await request(app)
      .get("/api/compras/mias")
      .set(await auth(BRUNO));
    expect(res.status).toBe(200);
    const fechas = res.body.map((c) => Date.parse(c.evento.fecha));
    const ahora = Date.now();
    const futuras = fechas.filter((f) => f > ahora);
    expect(fechas.slice(0, futuras.length)).toEqual([...futuras].sort((a, b) => a - b));
    expect(sinCamposInternos(res.body)).toBe(true);

    const estrenos = res.body.find((c) => c.evento.nombre === "Stand-up: Noche de Estrenos");
    expect(estrenos).toMatchObject({
      estado: "CONFIRMADA",
      diasParaElEvento: 10,
      puedePagar: false,
      puedeCancelar: true,
    });
    const enredos = res.body.find((c) => c.evento.nombre === "Comedia de Enredos");
    expect(enredos).toMatchObject({
      estado: "UTILIZADA",
      puedeReseniar: false,
      mensajesNoLeidos: 1,
    });
    expect(enredos.evento.imagen.url).toMatch(/^http/);
  });

  test("filtro por estado y estado inválido → 400", async () => {
    const res = await request(app)
      .get("/api/compras/mias?estado=PENDIENTE")
      .set(await auth(BRUNO));
    expect(res.body.every((c) => c.estado === "PENDIENTE" && c.fechaLimitePago)).toBe(true);
    expect(
      (
        await request(app)
          .get("/api/compras/mias?estado=PAGADA")
          .set(await auth(BRUNO))
      ).status,
    ).toBe(400);
  });

  test("detalle de compra inexistente → 404; id inválido → 400", async () => {
    const headers = await auth(ANA);
    expect(
      (await request(app).get("/api/compras/64a5f2c1e4b0a1b2c3d4ffff").set(headers)).status,
    ).toBe(404);
    expect((await request(app).get("/api/compras/xyz").set(headers)).status).toBe(400);
  });
});

describe("Compras de un evento (organizador)", () => {
  test("resumen: vendidas + disponibles = cupo, conteo por estado, recaudación y reembolsos", async () => {
    const evento = await eventoDeLucia();
    const pagada = await compraHecha(ANA, evento, { cantidad: 2 });
    await accion(ANA, pagada, "pagar");
    await compraHecha(BRUNO, evento, { tipo: 1, cantidad: 1 });
    const cancelada = await compraHecha(BRUNO, evento, { cantidad: 3 });
    await accion(BRUNO, cancelada, "pagar");
    await accion(BRUNO, cancelada, "cancelar");

    const res = await request(app)
      .get(`/api/eventos/${evento.id}/compras`)
      .set(await auth(LUCIA));
    expect(res.status).toBe(200);
    const { resumen, compras } = res.body;
    for (const tipo of resumen.tiposEntrada) {
      expect(tipo.vendidas + tipo.disponibles).toBe(tipo.cupo);
    }
    expect(resumen.tiposEntrada.map((t) => [t.nombre, t.vendidas])).toEqual([
      ["General", 2],
      ["VIP", 1],
    ]);
    expect(resumen.porEstado).toEqual({
      PENDIENTE: 1,
      CONFIRMADA: 1,
      UTILIZADA: 0,
      CANCELADA: 1,
      REEMBOLSADA: 0,
    });
    expect(resumen.recaudacionConfirmada).toBe(3001);
    expect(resumen.reembolsosPendientes).toEqual([
      { compraId: cancelada.id, total: 4501.5, fechaLimiteReembolso: expect.any(String) },
    ]);
    expect(compras).toHaveLength(3);
    expect(compras.find((c) => c.id === cancelada.id)).toMatchObject({
      comprador: { nombre: "Bruno", apellido: "Díaz" },
      acciones: { puedeReembolsar: true },
    });
    expect(sinCamposInternos(res.body)).toBe(true);

    const filtradas = await request(app)
      .get(`/api/eventos/${evento.id}/compras?estado=CONFIRMADA`)
      .set(await auth(LUCIA));
    expect(filtradas.body.compras.map((c) => c.id)).toEqual([pagada.id]);
    expect(filtradas.body.resumen.porEstado.CANCELADA).toBe(1);
  });

  test("evento de la semilla: el resumen cuadra", async () => {
    const jazz = await eventoSemilla("jazz");
    const res = await request(app)
      .get(`/api/eventos/${jazz.id}/compras`)
      .set(await auth(LUCIA));
    for (const tipo of res.body.resumen.tiposEntrada)
      expect(tipo.vendidas + tipo.disponibles).toBe(tipo.cupo);
  });
});

describe("Hook de cambio de estado (para la iteración 06)", () => {
  test("se llama con la compra y el cambio en cada transición; si falla no rompe la operación", async () => {
    const hook = jest.fn().mockRejectedValueOnce(new Error("socket caído"));
    comprasService.alCambiarEstado = hook;
    const errorOriginal = comprasService.log;
    comprasService.log = { error: jest.fn() };
    try {
      const evento = await eventoDeLucia();
      const compra = await compraHecha(ANA, evento);
      await accion(ANA, compra, "pagar");
      expect(hook).toHaveBeenCalledTimes(2);
      expect(hook.mock.calls[1][1]).toMatchObject({
        estadoAnterior: "PENDIENTE",
        estadoNuevo: "CONFIRMADA",
      });
      expect(comprasService.log.error).toHaveBeenCalledTimes(1);
    } finally {
      comprasService.alCambiarEstado = null;
      comprasService.log = errorOriginal;
    }
  });
});
