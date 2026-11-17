import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcrypt";
import { categoriasPreferidas } from "../domain/recomendacionDominio.js";
import { EstadoCompra, MotivoCancelacion } from "../domain/estadoCompraDominio.js";
import { CategoriasMongoRepository } from "../repositories/mongo/CategoriasMongoRepository.js";
import { ComprasMongoRepository } from "../repositories/mongo/ComprasMongoRepository.js";
import { EventosMongoRepository } from "../repositories/mongo/EventosMongoRepository.js";
import { ReseniasMongoRepository } from "../repositories/mongo/ReseniasMongoRepository.js";
import { NotificacionesMongoRepository } from "../repositories/mongo/NotificacionesMongoRepository.js";
import { NotificacionModel } from "../schemas/notificacionSchema.js";
import { UsuariosMongoRepository } from "../repositories/mongo/UsuariosMongoRepository.js";
import { CompraModel } from "../schemas/compraSchema.js";
import { EventoModel } from "../schemas/eventoSchema.js";
import { ReseniaModel } from "../schemas/reseniaSchema.js";
import { UsuarioModel } from "../schemas/usuarioSchema.js";
import { CategoriaModel } from "../schemas/categoriaSchema.js";
import { PASSWORD_DEMO } from "../seeds/datosSemilla.js";
import { sembrarDatos } from "../seeds/sembrar.js";
import { bajarDB, levantarDB } from "./helpers/dbMemoria.js";

const HORA = 60 * 60 * 1000;
const ahora = new Date();
const reloj = { ahora: () => new Date(ahora) };

const repos = {
  usuariosRepository: new UsuariosMongoRepository(),
  categoriasRepository: new CategoriasMongoRepository(),
  eventosRepository: new EventosMongoRepository({ reloj }),
  comprasRepository: new ComprasMongoRepository(),
  reseniasRepository: new ReseniasMongoRepository(),
  notificacionesRepository: new NotificacionesMongoRepository(),
};

const contar = async () => ({
  categorias: await CategoriaModel.countDocuments().incluirInactivos(),
  usuarios: await UsuarioModel.countDocuments().incluirInactivos(),
  eventos: await EventoModel.countDocuments().incluirInactivos(),
  compras: await CompraModel.countDocuments().incluirInactivos(),
  resenias: await ReseniaModel.countDocuments().incluirInactivos(),
  notificaciones: await NotificacionModel.countDocuments().incluirInactivos(),
});

let resumen;

beforeAll(async () => {
  await levantarDB();
  resumen = await sembrarDatos({ ...repos, reloj });
});
afterAll(bajarDB);

describe("Seeds", () => {
  test("cargan los datos de demo", async () => {
    expect(resumen).toEqual({
      categorias: 8,
      usuarios: 7,
      eventos: 16,
      compras: 15,
      resenias: 3,
      notificaciones: 59,
    });
    expect(await contar()).toEqual({
      categorias: 8,
      usuarios: 7,
      eventos: 16,
      compras: 15,
      resenias: 3,
      notificaciones: 59,
    });
  });

  test("correrlos dos veces no duplica nada", async () => {
    const antes = await contar();
    const segunda = await sembrarDatos({ ...repos, reloj });
    expect(segunda).toEqual({
      categorias: 0,
      usuarios: 0,
      eventos: 0,
      compras: 0,
      resenias: 0,
      notificaciones: 0,
    });
    expect(await contar()).toEqual(antes);
  });

  test("categorías fijas", async () => {
    expect((await repos.categoriasRepository.listar()).map((c) => c.nombre)).toEqual([
      "Conferencias",
      "Danza",
      "Deportes",
      "Festivales",
      "Infantiles",
      "Recitales",
      "Stand-up",
      "Teatro",
    ]);
  });

  test("3 organizadores y 4 compradores con la contraseña documentada", async () => {
    const todos = await UsuarioModel.find().lean();
    expect(todos.filter((u) => u.rol === "ORGANIZADOR")).toHaveLength(3);
    expect(todos.filter((u) => u.rol === "COMPRADOR")).toHaveLength(4);
    const ana = await repos.usuariosRepository.obtenerPorEmail("ana@ticketit.test");
    expect(await bcrypt.compare(PASSWORD_DEMO, ana.passwordHash)).toBe(true);
  });

  test("eventos futuros, uno en menos de 48 h y 3 pasados finalizados", async () => {
    const futuros = await repos.eventosRepository.buscar({ limite: 50 });
    const anteriores = await repos.eventosRepository.buscar({ anteriores: true, limite: 50 });
    expect(futuros.total).toBe(13);
    expect(anteriores.total).toBe(3);
    expect(anteriores.items.every((e) => !e.activo)).toBe(true);
    expect(futuros.items.some((e) => e.fecha.getTime() - ahora.getTime() < 48 * HORA)).toBe(true);
    // Hay al menos un evento agotado (para probar conDisponibilidad).
    const conDisponibilidad = await repos.eventosRepository.buscar({
      conDisponibilidad: true,
      limite: 50,
    });
    expect(conDisponibilidad.total).toBe(12);
    // Todos tienen imagen con texto alternativo.
    expect(futuros.items.every((e) => e.imagenPrincipal?.alt)).toBe(true);
  });

  test("las imágenes de los eventos se copian a UPLOADS_DIR", async () => {
    const evento = (await repos.eventosRepository.buscar()).items[0];
    const ruta = evento.imagenPrincipal.ruta.replace(/^\/uploads\//, "");
    expect(fs.existsSync(path.join(process.env.UPLOADS_DIR, ruta))).toBe(true);
  });

  test("hay compras en todos los estados, con historial coherente", async () => {
    const compras = (await CompraModel.find().lean()).map((d) =>
      repos.comprasRepository.hidratar(d),
    );
    const estados = new Set(compras.map((c) => c.estado));
    expect([...estados].sort()).toEqual(Object.values(EstadoCompra).sort());

    for (const compra of compras) {
      expect(compra.historial[0].estadoAnterior).toBeNull();
      expect(compra.historial.at(-1).estadoNuevo).toBe(compra.estado);
      for (let i = 1; i < compra.historial.length; i++) {
        expect(compra.historial[i].estadoAnterior).toBe(compra.historial[i - 1].estadoNuevo);
        expect(compra.historial[i].fechaHora >= compra.historial[i - 1].fechaHora).toBe(true);
      }
    }

    // Ninguna PENDIENTE quedó vencida y ningún reembolso pendiente quedó fuera de plazo.
    expect(await repos.comprasRepository.listarPendientesVencidas(ahora)).toEqual([]);
    expect(await repos.comprasRepository.listarReembolsosVencidos(ahora)).toEqual([]);
    expect(await repos.comprasRepository.listarConfirmadasDeEventosOcurridos(ahora)).toEqual([]);

    const canceladas = compras.filter((c) => c.estado === EstadoCompra.CANCELADA);
    expect(canceladas.map((c) => c.motivoCancelacion)).toContain(MotivoCancelacion.VENCIDA);
    expect(canceladas.some((c) => c.reembolsoPendiente)).toBe(true);
    const reembolsadas = compras.filter((c) => c.estado === EstadoCompra.REEMBOLSADA);
    expect(reembolsadas.map((c) => c.historial.at(-1).quien.id)).toContain("SISTEMA");
    expect(compras.some((c) => c.mensajes.length > 0)).toBe(true);
  });

  test("el cupo refleja las compras activas", async () => {
    const compras = (await CompraModel.find().lean()).map((d) =>
      repos.comprasRepository.hidratar(d),
    );
    const eventos = await repos.eventosRepository.obtenerVarios(compras.map((c) => c.eventoId));
    for (const evento of eventos) {
      for (const tipo of evento.tiposEntrada) {
        const ocupadas = compras
          .filter(
            (c) =>
              c.tipoEntradaId === tipo.id &&
              [EstadoCompra.PENDIENTE, EstadoCompra.CONFIRMADA, EstadoCompra.UTILIZADA].includes(
                c.estado,
              ),
          )
          .reduce((suma, c) => suma + c.cantidad, 0);
        expect(tipo.vendidas).toBe(ocupadas);
      }
    }
  });

  test("UTILIZADAS con reseña (y alguna sin reseña) y puntaje del organizador actualizado", async () => {
    const compras = (await CompraModel.find({ estado: "UTILIZADA" }).lean()).map((d) =>
      repos.comprasRepository.hidratar(d),
    );
    expect(compras.filter((c) => c.reseniaId != null)).toHaveLength(3);
    expect(compras.some((c) => c.puedeReseniar(c.compradorId))).toBe(true);

    const lucia = await repos.usuariosRepository.obtenerPorEmail("lucia@ticketit.test");
    expect(lucia).toMatchObject({ puntajePromedio: 5, cantidadResenias: 1 });
    const sofia = await repos.usuariosRepository.obtenerPorEmail("sofia@ticketit.test");
    expect(sofia).toMatchObject({ puntajePromedio: 4, cantidadResenias: 1 });
  });

  test("al menos 2 compradores con favoritos concentrados y 1 sin favoritos", async () => {
    const preferidas = {};
    for (const email of ["ana@ticketit.test", "bruno@ticketit.test", "diego@ticketit.test"]) {
      const usuario = await repos.usuariosRepository.obtenerPorEmail(email);
      const favoritos = await repos.eventosRepository.obtenerVarios(usuario.favoritos);
      preferidas[email] = categoriasPreferidas(favoritos);
    }
    for (const email of ["ana@ticketit.test", "bruno@ticketit.test"]) {
      const [principal, ...resto] = preferidas[email];
      expect(resto.length).toBeLessThanOrEqual(1);
      expect(principal.peso).toBeGreaterThan(0.5);
    }
    expect(preferidas["diego@ticketit.test"]).toEqual([]);
  });
});

describe("Notificaciones de la semilla", () => {
  const deUsuario = async (email) => {
    const usuario = await repos.usuariosRepository.obtenerPorEmail(email);
    return (await repos.notificacionesRepository.listarPorDestinatario(usuario.id, { limite: 50 }))
      .items;
  };

  test("se generan con los mismos templates que el flujo real y las viejas quedan leídas", async () => {
    const lucia = await deUsuario("lucia@ticketit.test");
    const reembolso = lucia.find((n) => n.tipo === "COMPRA_CANCELADA");
    expect(reembolso).toMatchObject({ leida: false, titulo: "Compra cancelada" });
    expect(reembolso.mensaje).toMatch(
      /Tenés que reembolsar \$104\.000,00 antes del \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/,
    );
    expect(reembolso.datos).toEqual({ compraId: expect.any(String), eventoId: expect.any(String) });

    const diego = await deUsuario("diego@ticketit.test");
    expect(diego.find((n) => n.tipo === "REEMBOLSO_REALIZADO").mensaje).toContain(
      "reembolso automático",
    );

    const ana = await deUsuario("ana@ticketit.test");
    const mensaje = ana.find((n) => n.tipo === "NUEVO_MENSAJE");
    expect(mensaje).toMatchObject({ leida: false });
    expect(mensaje.mensaje).toContain("Lucía Ferrari te escribió");

    const todas = await NotificacionModel.find().lean();
    const haceUnDia = ahora.getTime() - 24 * HORA;
    expect(todas.every((n) => n.leida === n.fecha.getTime() <= haceUnDia)).toBe(true);
  });

  test("las marcas de lectura del chat quedan guardadas", async () => {
    const jazz = await repos.eventosRepository.obtenerPorNombre("Noche de Jazz en el Sótano");
    const [compra] = await repos.comprasRepository.listarPorEvento(jazz.id);
    expect(compra.mensajesNoLeidosPara(compra.compradorId)).toBe(1);
    expect(compra.mensajesNoLeidosPara(compra.organizadorId)).toBe(0);
  });
});
