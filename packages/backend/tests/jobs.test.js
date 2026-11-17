import { jest } from "@jest/globals";
import { Compra } from "../domain/compraDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import {
  comprasRepository,
  comprasService,
  eventosRepository,
  programadorTareas,
  reloj,
  usuariosRepository,
} from "../dependencias.js";
import { ProgramadorTareas } from "../jobs/ProgramadorTareas.js";
import {
  avanzarReloj,
  cerrarApi,
  eventoSemilla,
  prepararApiConSemilla,
  restaurarReloj,
} from "./helpers/apiSemilla.js";

const HORA = 60 * 60 * 1000;

beforeAll(prepararApiConSemilla);
afterEach(restaurarReloj);
afterAll(cerrarApi);

describe("ProgramadorTareas", () => {
  test("ejecuta las tareas en orden; si una falla, siguen las demás", async () => {
    const orden = [];
    const log = { error: jest.fn(), log: jest.fn() };
    const programador = new ProgramadorTareas({
      reloj,
      log,
      tareas: [
        { nombre: "a", ejecutar: async () => (orden.push("a"), 2) },
        {
          nombre: "b",
          ejecutar: async () => {
            throw new Error("falló");
          },
        },
        { nombre: "c", ejecutar: async () => (orden.push("c"), 0) },
      ],
    });
    expect(await programador.ejecutarTodas()).toEqual({ a: 2, b: "error", c: 0 });
    expect(orden).toEqual(["a", "c"]);
    expect(log.error).toHaveBeenCalledWith(expect.stringContaining("La tarea b falló"));
  });

  test("dos corridas simultáneas no se solapan", async () => {
    let corridas = 0;
    const programador = new ProgramadorTareas({
      reloj,
      log: {},
      tareas: [{ nombre: "lenta", ejecutar: async () => (corridas += 1) }],
    });
    await Promise.all([programador.ejecutarTodas(), programador.ejecutarTodas()]);
    expect(corridas).toBe(1);
  });

  test("con NODE_ENV=test no se inicia; afuera sí, con setInterval", async () => {
    const tarea = jest.fn(async () => 0);
    const programador = new ProgramadorTareas({
      reloj,
      log: {},
      intervaloMs: 10,
      tareas: [{ nombre: "t", ejecutar: tarea }],
    });
    expect(programador.iniciar()).toBe(false);
    expect(tarea).not.toHaveBeenCalled();

    process.env.NODE_ENV = "development";
    try {
      expect(programador.iniciar()).toBe(true);
      expect(programador.iniciar()).toBe(false); // ya estaba iniciado
      await new Promise((r) => setTimeout(r, 35));
      expect(tarea.mock.calls.length).toBeGreaterThanOrEqual(2);
    } finally {
      programador.detener();
      process.env.NODE_ENV = "test";
    }
  });
});

describe("Tareas sobre los datos de la semilla", () => {
  test("al avanzar 60 h aplican vencimientos, reembolsos y finalización (y son idempotentes)", async () => {
    // Semilla: Folklore (evento a +30 h) y Risas (+45 h) tienen compras PENDIENTE; Primavera tiene un
    // reembolso pendiente que vence a +19 h; Folklore es el único evento que ocurre en 60 h.
    await avanzarReloj(60 * HORA);
    expect(await programadorTareas.ejecutarTodas()).toEqual({
      vencerComprasPendientes: 2,
      marcarComprasUtilizadas: 0,
      reembolsosAutomaticos: 1,
      finalizarEventosPasados: 1,
    });
    const folklore = await eventoSemilla("folklore");
    expect(folklore.activo).toBe(false);
    expect(folklore.modificadoPor).toBe("SISTEMA");
    expect(folklore.tiposEntrada[0].disponibles).toBe(80);

    expect(await programadorTareas.ejecutarTodas()).toEqual({
      vencerComprasPendientes: 0,
      marcarComprasUtilizadas: 0,
      reembolsosAutomaticos: 0,
      finalizarEventosPasados: 0,
    });
  });

  test("al pasar un evento, sus compras CONFIRMADA quedan UTILIZADA", async () => {
    await avanzarReloj(6 * 24 * HORA); // Jazz es a +5 días
    const resultados = await programadorTareas.ejecutarTodas();
    expect(resultados.marcarComprasUtilizadas).toBeGreaterThanOrEqual(1);
    const jazz = await eventoSemilla("jazz");
    const [compra] = await comprasRepository.listarPorEvento(jazz.id);
    expect(compra.estado).toBe("UTILIZADA");
    expect(compra.historial.at(-1).quien.id).toBe("SISTEMA");
  });
});

describe("Concurrencia entre el job y la evaluación perezosa", () => {
  test("un vencimiento aplicado en paralelo libera el cupo una sola vez", async () => {
    const hamlet = await eventoSemilla("hamlet");
    const tipo = hamlet.tiposEntrada[1]; // Pullman, cupo 60, sin compras
    const ana = await usuariosRepository.obtenerPorEmail("ana@ticketit.test");
    const comprador = { id: ana.id, nombre: ana.nombreCompleto, rol: Roles.COMPRADOR };

    // Dos compras: una que va a vencer (3) y una pagada (2). Si la primera liberara dos veces,
    // el cupo volvería a 60 en lugar de 58.
    const crear = async (cantidad) => {
      const evento = await eventosRepository.obtenerPorId(hamlet.id);
      const compra = Compra.crear({ comprador, evento, tipoEntradaId: tipo.id, cantidad, reloj });
      await eventosRepository.reservarCupo(hamlet.id, tipo.id, cantidad);
      return comprasRepository.guardar(compra);
    };
    const aVencer = await crear(3);
    const pagada = await crear(2);
    pagada.pagar(comprador, reloj);
    await comprasRepository.guardar(pagada);

    await avanzarReloj(48 * HORA);
    const corridas = await Promise.allSettled([
      comprasService.vencerComprasPendientes(),
      comprasService.vencerComprasPendientes(),
      comprasService.detalle(aVencer.id, comprador),
      comprasService.listarMias(comprador),
    ]);
    expect(corridas.every((c) => c.status === "fulfilled")).toBe(true);

    const final = await comprasRepository.obtenerPorId(aVencer.id);
    expect(final.estado).toBe("CANCELADA");
    expect(final.historial.filter((c) => c.estadoNuevo === "CANCELADA")).toHaveLength(1);
    const evento = await eventosRepository.obtenerPorId(hamlet.id);
    expect(evento.tiposEntrada[1].disponibles).toBe(58);
  });
});
