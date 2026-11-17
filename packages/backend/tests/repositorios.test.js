import { Categoria } from "../domain/categoriaDominio.js";
import { Compra } from "../domain/compraDominio.js";
import { EstadoCompra } from "../domain/estadoCompraDominio.js";
import { Evento } from "../domain/eventoDominio.js";
import { Notificacion } from "../domain/notificacionDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import { TipoEntrada } from "../domain/tipoEntradaDominio.js";
import { Usuario } from "../domain/usuarioDominio.js";
import { BadRequestError, ConflictError, NotFoundError } from "../errors/AppError.js";
import { CategoriasMongoRepository } from "../repositories/mongo/CategoriasMongoRepository.js";
import { ComprasMongoRepository } from "../repositories/mongo/ComprasMongoRepository.js";
import { EventosMongoRepository } from "../repositories/mongo/EventosMongoRepository.js";
import { NotificacionesMongoRepository } from "../repositories/mongo/NotificacionesMongoRepository.js";
import { ReseniasMongoRepository } from "../repositories/mongo/ReseniasMongoRepository.js";
import { UsuariosMongoRepository } from "../repositories/mongo/UsuariosMongoRepository.js";
import { EventoModel } from "../schemas/eventoSchema.js";
import { bajarDB, levantarDB, limpiarDB } from "./helpers/dbMemoria.js";
import { AHORA, DIA, HORA, relojFijo } from "./helpers/fabricasDominio.js";

const usuarios = new UsuariosMongoRepository();
const categorias = new CategoriasMongoRepository();
const eventos = new EventosMongoRepository({ reloj: relojFijo() });
const compras = new ComprasMongoRepository();
const resenias = new ReseniasMongoRepository();
const notificaciones = new NotificacionesMongoRepository();

const ID_INEXISTENTE = "64a5f2c1e4b0a1b2c3d4ffff";

const nuevoUsuario = (extra = {}) =>
  new Usuario({
    nombre: "Ana",
    apellido: "Gómez",
    email: "ana@test.com",
    passwordHash: "hash",
    rol: Roles.COMPRADOR,
    ...extra,
  });

/** Organizador, categoría y evento futuro guardados. */
async function escenario() {
  const organizador = await usuarios.guardar(
    nuevoUsuario({ nombre: "Lucía", email: "lucia@test.com", rol: Roles.ORGANIZADOR }),
  );
  const comprador = await usuarios.guardar(nuevoUsuario());
  const categoria = await categorias.guardar(new Categoria({ nombre: "Recitales" }));
  const evento = await eventos.guardar(
    new Evento({
      nombre: "Noche de Jazz",
      descripcion: "Jazz en vivo",
      categoriaId: categoria.id,
      fecha: new Date(AHORA.getTime() + 10 * DIA),
      lugar: "Club Sur",
      organizadorId: organizador.id,
      tiposEntrada: [
        { nombre: "General", precio: 1000, cupo: 10 },
        { nombre: "VIP", precio: 5000, cupo: 2 },
      ],
      multimedia: [{ ruta: "/uploads/a.png", tipo: "imagen", alt: "Afiche" }],
    }),
  );
  return { organizador, comprador, categoria, evento };
}

const actor = (u) => ({ id: u.id, nombre: u.nombreCompleto, rol: u.rol });

beforeAll(levantarDB);
afterEach(limpiarDB);
afterAll(bajarDB);

describe("UsuariosMongoRepository", () => {
  test("guardar → obtener devuelve un Usuario equivalente", async () => {
    const guardado = await usuarios.guardar(nuevoUsuario({ favoritos: [ID_INEXISTENTE] }));
    expect(guardado).toBeInstanceOf(Usuario);
    expect(typeof guardado.id).toBe("string");
    const obtenido = await usuarios.obtenerPorId(guardado.id);
    expect(obtenido).toEqual(guardado);
    expect(obtenido.favoritos).toEqual([ID_INEXISTENTE]);
    expect(await usuarios.obtenerPorEmail(" ANA@test.com ")).toEqual(guardado);
  });

  test("el email es único", async () => {
    await usuarios.guardar(nuevoUsuario());
    await expect(usuarios.guardar(nuevoUsuario())).rejects.toThrow(ConflictError);
  });

  test("un id inválido o inexistente devuelve null", async () => {
    expect(await usuarios.obtenerPorId("no-es-id")).toBeNull();
    expect(await usuarios.obtenerPorId(ID_INEXISTENTE)).toBeNull();
    expect(await usuarios.obtenerPorEmail(undefined)).toBeNull();
  });

  test("obtenerVarios incluye inactivos e ignora ids inválidos", async () => {
    const a = await usuarios.guardar(nuevoUsuario());
    const b = nuevoUsuario({ email: "b@test.com" });
    b.darDeBaja({ id: "admin" });
    const bGuardado = await usuarios.guardar(b);
    const varios = await usuarios.obtenerVarios([a.id, bGuardado.id, "x", a.id]);
    expect(varios.map((u) => u.email).sort()).toEqual(["ana@test.com", "b@test.com"]);
    expect(await usuarios.obtenerVarios([])).toEqual([]);
  });

  test("delete hace baja lógica con auditoría y exige quién la hace", async () => {
    const u = await usuarios.guardar(nuevoUsuario());
    await expect(usuarios.delete(u.id)).rejects.toThrow(BadRequestError);
    await expect(usuarios.delete(ID_INEXISTENTE, { id: "x" })).rejects.toThrow(NotFoundError);
    const baja = await usuarios.delete(u.id, { id: "admin" }, relojFijo());
    expect(baja).toMatchObject({ activo: false, modificadoPor: "admin", fechaModificacion: AHORA });
    expect(await usuarios.obtenerPorId(u.id)).toBeNull();
    expect(await usuarios.obtenerPorId(u.id, { incluirInactivos: true })).not.toBeNull();
  });

  test("el organizador conserva su puntaje", async () => {
    const org = nuevoUsuario({ rol: Roles.ORGANIZADOR });
    org.registrarResenia(4);
    const obtenido = await usuarios.obtenerPorId((await usuarios.guardar(org)).id);
    expect(obtenido).toMatchObject({ puntajePromedio: 4, cantidadResenias: 1 });
  });
});

describe("CategoriasMongoRepository", () => {
  test("guardar → obtener, listar ordenado y buscar por nombre sin mayúsculas", async () => {
    const teatro = await categorias.guardar(
      new Categoria({ nombre: "Teatro", descripcion: "Obras" }),
    );
    await categorias.guardar(new Categoria({ nombre: "Danza" }));
    expect(await categorias.obtenerPorId(teatro.id)).toEqual(teatro);
    expect((await categorias.listar()).map((c) => c.nombre)).toEqual(["Danza", "Teatro"]);
    expect((await categorias.obtenerPorNombre("teatro")).id).toBe(teatro.id);
  });
});

describe("EventosMongoRepository", () => {
  test("guardar → obtener devuelve un Evento equivalente, con ids de tipos", async () => {
    const { evento } = await escenario();
    expect(evento).toBeInstanceOf(Evento);
    expect(evento.tiposEntrada[0]).toBeInstanceOf(TipoEntrada);
    expect(evento.tiposEntrada.every((t) => typeof t.id === "string")).toBe(true);
    expect(await eventos.obtenerPorId(evento.id)).toEqual(evento);
  });

  test("al modificar agrega tipos nuevos sin pisar disponibles de los existentes", async () => {
    const { evento } = await escenario();
    const general = evento.tiposEntrada[0];
    // Una reserva concurrente ocurre después de leer el evento en memoria.
    await eventos.reservarCupo(evento.id, general.id, 3);
    evento.agregarTipoEntrada({ nombre: "Platea", precio: 3000, cupo: 5 }, relojFijo());
    evento.ampliarDescripcion("Se suma un invitado", relojFijo());

    const guardado = await eventos.guardar(evento);
    expect(guardado.tiposEntrada.map((t) => t.nombre)).toEqual(["General", "VIP", "Platea"]);
    expect(guardado.tiposEntrada[0].disponibles).toBe(7);
    expect(guardado.tiposEntrada[2].id).toEqual(expect.any(String));
    expect(guardado.ampliacionesDescripcion).toHaveLength(1);
  });

  test("obtenerPorId de un evento finalizado requiere incluirInactivos", async () => {
    const { evento } = await escenario();
    const reloj = relojFijo(new Date(AHORA.getTime() + 11 * DIA));
    evento.finalizar({ id: "SISTEMA" }, reloj);
    await eventos.guardar(evento);
    expect(await eventos.obtenerPorId(evento.id)).toBeNull();
    expect((await eventos.obtenerPorId(evento.id, { incluirInactivos: true })).activo).toBe(false);
  });

  test("listarPorOrganizador incluye finalizados; listarParaFinalizar solo activos pasados", async () => {
    const { evento, organizador } = await escenario();
    expect(await eventos.listarParaFinalizar(AHORA)).toEqual([]);
    const despues = new Date(AHORA.getTime() + 11 * DIA);
    expect((await eventos.listarParaFinalizar(despues)).map((e) => e.id)).toEqual([evento.id]);
    evento.finalizar({ id: "SISTEMA" }, relojFijo(despues));
    await eventos.guardar(evento);
    expect(await eventos.listarParaFinalizar(despues)).toEqual([]);
    expect(await eventos.listarPorOrganizador(organizador.id)).toHaveLength(1);
    expect(await eventos.listarPorOrganizador("x")).toEqual([]);
    expect(await eventos.obtenerVarios([evento.id, "x"])).toHaveLength(1);
  });
});

describe("Cupo atómico", () => {
  test("20 reservas concurrentes sobre cupo 5 → exactamente 5 éxitos", async () => {
    const { evento } = await escenario();
    const tipo = evento.tiposEntrada[0];
    await EventoModel.updateOne(
      { _id: evento.id, "tiposEntrada._id": tipo.id },
      { $set: { "tiposEntrada.$.disponibles": 5, "tiposEntrada.$.cupo": 5 } },
    );

    const resultados = await Promise.allSettled(
      Array.from({ length: 20 }, () => eventos.reservarCupo(evento.id, tipo.id, 1)),
    );

    const exitos = resultados.filter((r) => r.status === "fulfilled");
    const fallos = resultados.filter((r) => r.status === "rejected");
    expect(exitos).toHaveLength(5);
    expect(fallos).toHaveLength(15);
    expect(fallos.every((r) => r.reason instanceof ConflictError)).toBe(true);
    const actualizado = await eventos.obtenerPorId(evento.id);
    expect(actualizado.tiposEntrada[0].disponibles).toBe(0);
  });

  test("no reserva más de lo disponible y no toca otros tipos", async () => {
    const { evento } = await escenario();
    const [general, vip] = evento.tiposEntrada;
    await expect(eventos.reservarCupo(evento.id, vip.id, 3)).rejects.toThrow(
      "No hay cupo suficiente",
    );
    await eventos.reservarCupo(evento.id, vip.id, 2);
    const actualizado = await eventos.obtenerPorId(evento.id);
    expect(actualizado.tiposEntrada.map((t) => t.disponibles)).toEqual([general.disponibles, 0]);
  });

  test("evento o tipo inexistente → NotFoundError", async () => {
    const { evento } = await escenario();
    await expect(
      eventos.reservarCupo(ID_INEXISTENTE, evento.tiposEntrada[0].id, 1),
    ).rejects.toThrow(NotFoundError);
    await expect(eventos.reservarCupo(evento.id, ID_INEXISTENTE, 1)).rejects.toThrow(NotFoundError);
    await expect(eventos.reservarCupo("x", "y", 1)).rejects.toThrow(NotFoundError);
  });

  test("liberarCupo devuelve entradas sin superar el cupo", async () => {
    const { evento } = await escenario();
    const [general, vip] = evento.tiposEntrada;
    await eventos.reservarCupo(evento.id, general.id, 4);
    await eventos.liberarCupo(evento.id, general.id, 3);
    expect((await eventos.obtenerPorId(evento.id)).tiposEntrada[0].disponibles).toBe(9);
    await eventos.liberarCupo(evento.id, general.id, 50);
    const final = await eventos.obtenerPorId(evento.id);
    expect(final.tiposEntrada.map((t) => t.disponibles)).toEqual([10, vip.disponibles]);
  });
});

describe("ComprasMongoRepository", () => {
  async function compraGuardada(estados = []) {
    const datos = await escenario();
    const reloj = relojFijo();
    const compra = Compra.crear({
      comprador: actor(datos.comprador),
      evento: datos.evento,
      tipoEntradaId: datos.evento.tiposEntrada[1].id,
      cantidad: 2,
      reloj,
    });
    compra.agregarMensaje(actor(datos.comprador), "Hola", reloj);
    if (estados.includes("pagar")) compra.pagar(actor(datos.comprador), reloj);
    return { ...datos, reloj, compra: await compras.guardar(compra) };
  }

  test("guardar → obtener devuelve una Compra equivalente con historial y mensajes", async () => {
    const { compra } = await compraGuardada();
    expect(compra).toBeInstanceOf(Compra);
    expect(compra.mensajes[0].id).toEqual(expect.any(String));
    expect(await compras.obtenerPorId(compra.id)).toEqual(compra);
  });

  test("guardar una modificación no pisa mensajes agregados en paralelo", async () => {
    const { compra, organizador, reloj } = await compraGuardada();
    const mensaje = await compras.agregarMensaje(compra.id, {
      usuarioId: organizador.id,
      usuarioNombre: "Lucía",
      rol: Roles.ORGANIZADOR,
      mensaje: "¡Gracias!",
      enviado: reloj.ahora(),
    });
    expect(mensaje.id).toEqual(expect.any(String));

    compra.pagar({ id: compra.compradorId, nombre: "Ana", rol: Roles.COMPRADOR }, reloj); // copia sin el mensaje nuevo
    await compras.guardar(compra);

    const final = await compras.obtenerPorId(compra.id);
    expect(final.estado).toBe(EstadoCompra.CONFIRMADA);
    expect(final.mensajes.map((m) => m.mensaje)).toEqual(["Hola", "¡Gracias!"]);
  });

  test("agregarMensaje a una compra inexistente → NotFoundError", async () => {
    const msg = {
      usuarioId: "u",
      usuarioNombre: "A",
      rol: "COMPRADOR",
      mensaje: "x",
      enviado: AHORA,
    };
    await expect(compras.agregarMensaje(ID_INEXISTENTE, msg)).rejects.toThrow(NotFoundError);
    await expect(compras.agregarMensaje("x", msg)).rejects.toThrow(NotFoundError);
  });

  test("listados por comprador y evento, con filtro de estado", async () => {
    const { compra, comprador, evento } = await compraGuardada();
    expect((await compras.listarPorComprador(comprador.id)).map((c) => c.id)).toEqual([compra.id]);
    expect(await compras.listarPorComprador(comprador.id, { estado: "CONFIRMADA" })).toEqual([]);
    expect(await compras.listarPorEvento(evento.id, { estado: "PENDIENTE" })).toHaveLength(1);
    expect(await compras.listarPorEvento("x")).toEqual([]);
    expect(await compras.listarPorComprador("x")).toEqual([]);
  });

  test("listarPendientesVencidas en el borde de las 48 h", async () => {
    const { compra } = await compraGuardada();
    expect(
      await compras.listarPendientesVencidas(new Date(AHORA.getTime() + 48 * HORA - 1)),
    ).toEqual([]);
    const vencidas = await compras.listarPendientesVencidas(new Date(AHORA.getTime() + 48 * HORA));
    expect(vencidas.map((c) => c.id)).toEqual([compra.id]);
  });

  test("listarReembolsosVencidos en el borde de las 24 h", async () => {
    const { compra, evento, comprador, reloj } = await compraGuardada(["pagar"]);
    compra.cancelar(evento, actor(comprador), reloj);
    await compras.guardar(compra);
    expect(
      await compras.listarReembolsosVencidos(new Date(AHORA.getTime() + 24 * HORA - 1)),
    ).toEqual([]);
    expect(
      await compras.listarReembolsosVencidos(new Date(AHORA.getTime() + 24 * HORA)),
    ).toHaveLength(1);
  });

  test("listarConfirmadasDeEventosOcurridos hace join con la fecha del evento", async () => {
    const { compra, evento } = await compraGuardada(["pagar"]);
    expect(await compras.listarConfirmadasDeEventosOcurridos(AHORA)).toEqual([]);
    const ocurridas = await compras.listarConfirmadasDeEventosOcurridos(evento.fecha);
    expect(ocurridas.map((c) => c.id)).toEqual([compra.id]);
  });
});

describe("ReseniasMongoRepository", () => {
  async function reseniaDeCompra(datos, compraId = ID_INEXISTENTE) {
    return {
      compraId,
      compradorId: datos.comprador.id,
      compradorNombre: "Ana Gómez",
      eventoId: datos.evento.id,
      organizadorId: datos.organizador.id,
      tipoEntradaNombre: "VIP",
      puntuacion: 4.5,
      detalle: "Muy bueno",
      fecha: AHORA,
      activo: true,
    };
  }

  test("crear → listar, una sola reseña por compra", async () => {
    const datos = await escenario();
    const { Resenia } = await import("../domain/reseniaDominio.js");
    const creada = await resenias.crear(new Resenia(await reseniaDeCompra(datos)));
    expect(creada.id).toEqual(expect.any(String));
    expect(await resenias.existeParaCompra(ID_INEXISTENTE)).toBe(true);
    expect(await resenias.existeParaCompra("x")).toBe(false);
    await expect(resenias.crear(new Resenia(await reseniaDeCompra(datos)))).rejects.toThrow(
      ConflictError,
    );
    expect(await resenias.listarPorEvento(datos.evento.id)).toEqual([creada]);
    expect(await resenias.listarPorEvento("x")).toEqual([]);
  });

  test("listarPorOrganizador pagina de la más nueva a la más vieja", async () => {
    const datos = await escenario();
    const { Resenia } = await import("../domain/reseniaDominio.js");
    const ids = [
      "64a5f2c1e4b0a1b2c3d40001",
      "64a5f2c1e4b0a1b2c3d40002",
      "64a5f2c1e4b0a1b2c3d40003",
    ];
    for (const [i, compraId] of ids.entries()) {
      await resenias.crear(
        new Resenia({
          ...(await reseniaDeCompra(datos, compraId)),
          fecha: new Date(AHORA.getTime() + i * HORA),
        }),
      );
    }
    const pagina1 = await resenias.listarPorOrganizador(datos.organizador.id, {
      pagina: 1,
      limite: 2,
    });
    expect(pagina1.total).toBe(3);
    expect(pagina1.items.map((r) => r.compraId)).toEqual([ids[2], ids[1]]);
    const pagina2 = await resenias.listarPorOrganizador(datos.organizador.id, {
      pagina: 2,
      limite: 2,
    });
    expect(pagina2.items.map((r) => r.compraId)).toEqual([ids[0]]);
    expect((await resenias.listarPorOrganizador("x")).items).toEqual([]);
  });
});

describe("NotificacionesMongoRepository", () => {
  const nueva = (destinatarioId, extra = {}) =>
    new Notificacion({
      destinatarioId,
      tipo: "COMPRA_CONFIRMADA",
      titulo: "Compra confirmada",
      mensaje: "Tu compra fue confirmada",
      datos: { compraId: ID_INEXISTENTE },
      fecha: AHORA,
      ...extra,
    });

  test("crear, listar paginado, contar y marcar leídas", async () => {
    const { comprador } = await escenario();
    const primera = await notificaciones.crear(nueva(comprador.id));
    await notificaciones.crear(nueva(comprador.id, { fecha: new Date(AHORA.getTime() + HORA) }));
    await notificaciones.crear(nueva(comprador.id, { leida: true }));

    expect(primera).toBeInstanceOf(Notificacion);
    expect(primera.datos).toEqual({ compraId: ID_INEXISTENTE });
    expect(await notificaciones.contarNoLeidas(comprador.id)).toBe(2);

    const pagina = await notificaciones.listarPorDestinatario(comprador.id, { limite: 2 });
    expect(pagina.total).toBe(3);
    expect(pagina.items).toHaveLength(2);
    const noLeidas = await notificaciones.listarPorDestinatario(comprador.id, {
      soloNoLeidas: true,
    });
    expect(noLeidas.total).toBe(2);

    expect((await notificaciones.marcarLeida(primera.id)).leida).toBe(true);
    expect(await notificaciones.marcarLeida("x")).toBeNull();
    expect(await notificaciones.marcarTodasLeidas(comprador.id)).toBe(1);
    expect(await notificaciones.contarNoLeidas(comprador.id)).toBe(0);
    expect(await notificaciones.contarNoLeidas("x")).toBe(0);
    expect(await notificaciones.marcarTodasLeidas("x")).toBe(0);
    expect((await notificaciones.listarPorDestinatario("x")).items).toEqual([]);
  });

  test("guardar → obtener devuelve una Notificacion equivalente", async () => {
    const { comprador } = await escenario();
    const guardada = await notificaciones.guardar(nueva(comprador.id, { datos: {} }));
    expect(await notificaciones.obtenerPorId(guardada.id)).toEqual(guardada);
  });
});
