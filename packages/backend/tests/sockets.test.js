import http from "node:http";
import { io as conectar } from "socket.io-client";
import {
  comprasRepository,
  emisorSocket,
  notificacionesRepository,
  usuariosRepository,
} from "../dependencias.js";
import { inicializarSockets } from "../sockets/index.js";
import {
  app,
  auth,
  cerrarApi,
  eventoSemilla,
  prepararApiConSemilla,
  request,
  tokenDe,
} from "./helpers/apiSemilla.js";

const ANA = "ana@ticketit.test";
const BRUNO = "bruno@ticketit.test";
const LUCIA = "lucia@ticketit.test";

let servidor;
let io;
let url;
const clientes = [];

/** Cliente socket.io conectado (o rechazado) con el token indicado. */
function cliente(token) {
  const socket = conectar(url, {
    auth: token ? { token } : {},
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
  });
  clientes.push(socket);
  return socket;
}

const esperar = (socket, evento, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`No llegó ${evento}`)), ms);
    socket.once(evento, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

const conectado = async (email) => {
  const socket = cliente(await tokenDe(email));
  await esperar(socket, "connect");
  return socket;
};

const unirse = (socket, compraId) => socket.emitWithAck("compra:unirse", { compraId });

async function compraDeAnaEnJazz() {
  const jazz = await eventoSemilla("jazz");
  const ana = await usuariosRepository.obtenerPorEmail(ANA);
  return (await comprasRepository.listarPorEvento(jazz.id)).find((c) => c.compradorId === ana.id);
}

beforeAll(async () => {
  await prepararApiConSemilla();
  // Mismo http.Server para express y socket.io, como en index.js.
  servidor = http.createServer(app);
  io = inicializarSockets(servidor);
  await new Promise((r) => servidor.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${servidor.address().port}`;
});

afterEach(() => {
  while (clientes.length) clientes.pop().disconnect();
});

afterAll(async () => {
  emisorSocket.conectar(null);
  await new Promise((r) => io.close(r));
  await cerrarApi();
});

describe("Socket.io", () => {
  test("sin token o con token inválido se rechaza la conexión", async () => {
    const sinToken = cliente(null);
    expect((await esperar(sinToken, "connect_error")).message).toBe("No autorizado");
    const invalido = cliente("basura");
    expect((await esperar(invalido, "connect_error")).message).toBe("No autorizado");
  });

  test("unirse a una compra ajena devuelve error; a una propia, ok", async () => {
    const compra = await compraDeAnaEnJazz();
    const bruno = await conectado(BRUNO);
    expect(await unirse(bruno, compra.id)).toEqual({
      error: "Solo el comprador y el organizador pueden usar este chat",
    });
    expect(await unirse(bruno, "64a5f2c1e4b0a1b2c3d4ffff")).toEqual({
      error: "No existe la compra indicada",
    });
    const lucia = await conectado(LUCIA);
    expect(await unirse(lucia, compra.id)).toEqual({ ok: true });
  });

  test("mensaje:nuevo llega al otro participante tras un POST REST, sin notificación (está en la sala)", async () => {
    const compra = await compraDeAnaEnJazz();
    const lucia = await conectado(LUCIA);
    await unirse(lucia, compra.id);
    const antes = (await notificacionesRepository.listarPorDestinatario(compra.organizadorId))
      .total;

    const llega = esperar(lucia, "mensaje:nuevo");
    const res = await request(app)
      .post(`/api/compras/${compra.id}/mensajes`)
      .set(await auth(ANA))
      .send({ mensaje: "¿Abren puertas a las 20?" });
    expect(res.status).toBe(201);

    const payload = await llega;
    expect(payload).toEqual({ compraId: compra.id, mensaje: res.body });
    const despues = (await notificacionesRepository.listarPorDestinatario(compra.organizadorId))
      .total;
    expect(despues).toBe(antes);
  });

  test("después de compra:salir ya no recibe mensajes y sí la notificación", async () => {
    const compra = await compraDeAnaEnJazz();
    const lucia = await conectado(LUCIA);
    await unirse(lucia, compra.id);
    expect(await lucia.emitWithAck("compra:salir", { compraId: compra.id })).toEqual({ ok: true });

    let recibioMensaje = false;
    lucia.on("mensaje:nuevo", () => {
      recibioMensaje = true;
    });
    const notificacion = esperar(lucia, "notificacion:nueva");
    await request(app)
      .post(`/api/compras/${compra.id}/mensajes`)
      .set(await auth(ANA))
      .send({ mensaje: "¿Y el guardarropa?" });
    expect((await notificacion).tipo).toBe("NUEVO_MENSAJE");
    expect(recibioMensaje).toBe(false);
  });

  test("compra:estado y notificacion:nueva llegan a las salas de usuario en cada transición", async () => {
    const jazz = await eventoSemilla("jazz");
    const lucia = await conectado(LUCIA);
    const ana = await conectado(ANA);

    const estadoLucia = esperar(lucia, "compra:estado");
    const estadoAna = esperar(ana, "compra:estado");
    const notificacionLucia = esperar(lucia, "notificacion:nueva");
    const res = await request(app)
      .post("/api/compras")
      .set(await auth(ANA))
      .send({ eventoId: jazz.id, tipoEntradaId: jazz.tiposEntrada[0].id, cantidad: 1 });
    expect(res.status).toBe(201);

    const estado = await estadoLucia;
    expect(estado).toMatchObject({
      compraId: res.body.id,
      estado: "PENDIENTE",
      cambio: { estadoAnterior: null, estadoNuevo: "PENDIENTE", quien: { nombre: "Ana Gómez" } },
    });
    expect((await estadoAna).compraId).toBe(res.body.id);
    expect(await notificacionLucia).toMatchObject({
      tipo: "NUEVA_COMPRA",
      leida: false,
      datos: { compraId: res.body.id, eventoId: jazz.id },
    });
  });
});
