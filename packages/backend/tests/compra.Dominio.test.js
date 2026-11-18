import {
  Compra,
  HORAS_PARA_PAGAR,
  HORAS_PARA_REEMBOLSAR,
  MAX_ENTRADAS_POR_COMPRA,
} from "../domain/compraDominio.js";
import { CambioEstadoCompra } from "../domain/cambioEstadoCompraDominio.js";
import { ACTOR_SISTEMA, EstadoCompra, MotivoCancelacion } from "../domain/estadoCompraDominio.js";
import { Mensaje } from "../domain/mensajeDominio.js";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../errors/AppError.js";
import {
  AHORA,
  DIA,
  HORA,
  comprador,
  crearCompra,
  crearEvento,
  organizador,
  otroComprador,
  relojFijo,
} from "./helpers/fabricasDominio.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = EstadoCompra;

const vip = (evento) => evento.buscarTipoEntrada("tipo-vip");

/** Lleva una compra recién creada al estado pedido usando solo transiciones válidas. */
function compraEn(estado, opciones = {}) {
  const { compra, evento, reloj } = crearCompra(opciones);
  if ([CONFIRMADA, UTILIZADA, REEMBOLSADA].includes(estado) || estado === "CANCELADA_PAGA") {
    compra.pagar(comprador, reloj);
  }
  if (estado === UTILIZADA) {
    reloj.fijar(evento.fecha);
    compra.marcarUtilizada(evento, reloj);
  }
  if (estado === CANCELADA) compra.cancelar(evento, comprador, reloj);
  if (estado === "CANCELADA_PAGA" || estado === REEMBOLSADA) {
    compra.cancelar(evento, comprador, reloj);
  }
  if (estado === REEMBOLSADA) compra.reembolsar(organizador, reloj);
  return { compra, evento, reloj };
}

describe("Dominio Compra", () => {
  test("constantes configurables", () => {
    expect(HORAS_PARA_PAGAR).toBe(48);
    expect(HORAS_PARA_REEMBOLSAR).toBe(24);
    expect(MAX_ENTRADAS_POR_COMPRA).toBe(10);
    expect(Object.isFrozen(EstadoCompra)).toBe(true);
    expect(ACTOR_SISTEMA).toEqual({ id: "SISTEMA", nombre: "Sistema" });
  });

  describe("— → PENDIENTE (crear)", () => {
    test("crea la compra con el precio del evento, reserva cupo y registra el historial", () => {
      const { compra, evento } = crearCompra({ cantidad: 3 });
      expect(compra.estado).toBe(PENDIENTE);
      expect(compra.precioUnitario).toBe(45000);
      expect(compra.total).toBe(135000);
      expect(compra.tipoEntradaNombre).toBe("VIP");
      expect(compra.organizadorId).toBe(organizador.id);
      expect(vip(evento).disponibles).toBe(7);
      expect(compra.historial).toHaveLength(1);
      expect(compra.historial[0]).toBeInstanceOf(CambioEstadoCompra);
      expect(compra.historial[0]).toMatchObject({
        estadoAnterior: null,
        estadoNuevo: PENDIENTE,
        quien: { id: comprador.id, nombre: comprador.nombre, rol: "COMPRADOR" },
        fechaHora: AHORA,
        detalle: "Compra de 3 × VIP por $135.000,00",
      });
    });

    test("fechaLimitePago = fechaCompra + 48 h si el evento es posterior", () => {
      const { compra } = crearCompra();
      expect(compra.fechaCompra).toEqual(AHORA);
      expect(compra.fechaLimitePago).toEqual(new Date(AHORA.getTime() + 48 * HORA));
    });

    test("fechaLimitePago = fecha del evento si ocurre antes de las 48 h", () => {
      const fecha = new Date(AHORA.getTime() + 5 * HORA);
      const { compra } = crearCompra({ evento: crearEvento({ fecha }) });
      expect(compra.fechaLimitePago).toEqual(fecha);
    });

    test("sin cupo lanza ConflictError y no crea nada", () => {
      const evento = crearEvento();
      vip(evento).reservar(9);
      expect(() => crearCompra({ evento, cantidad: 2 })).toThrow(ConflictError);
      expect(vip(evento).disponibles).toBe(1);
    });

    test.each([0, 11, 2.5, "2"])("rechaza la cantidad %p", (cantidad) => {
      expect(() => crearCompra({ cantidad })).toThrow(BadRequestError);
    });

    test("acepta el máximo de 10 entradas", () => {
      expect(crearCompra({ tipoEntradaId: "tipo-general", cantidad: 10 }).compra.cantidad).toBe(10);
    });

    test("rechaza un evento que ya ocurrió o finalizado", () => {
      const pasado = crearEvento({ fecha: new Date(AHORA.getTime() - HORA) });
      expect(() => crearCompra({ evento: pasado })).toThrow("ya ocurrió");
      const finalizado = crearEvento();
      finalizado.activo = false;
      expect(() => crearCompra({ evento: finalizado })).toThrow(BadRequestError);
    });

    test("rechaza un tipo de entrada que no es del evento", () => {
      expect(() => crearCompra({ tipoEntradaId: "otro" })).toThrow(NotFoundError);
    });

    test("solo un COMPRADOR puede comprar", () => {
      expect(() => crearCompra({ quien: organizador })).toThrow(ForbiddenError);
    });

    test("redondea el total a 2 decimales", () => {
      const evento = crearEvento({
        tiposEntrada: [{ id: "t", nombre: "Promo", precio: 0.1, cupo: 10 }],
      });
      expect(crearCompra({ evento, tipoEntradaId: "t", cantidad: 3 }).compra.total).toBe(0.3);
    });
  });

  describe("PENDIENTE → CONFIRMADA (pagar)", () => {
    test("confirma antes de la fecha límite", () => {
      const { compra, reloj } = crearCompra();
      reloj.avanzar(48 * HORA - 1);
      compra.pagar(comprador, reloj);
      expect(compra.estado).toBe(CONFIRMADA);
      expect(compra.historial[1]).toMatchObject({
        estadoAnterior: PENDIENTE,
        estadoNuevo: CONFIRMADA,
        detalle: "Pago confirmado por $90.000,00",
      });
    });

    test("en el borde exacto de las 48 h ya venció", () => {
      const { compra, reloj } = crearCompra();
      reloj.avanzar(48 * HORA);
      expect(() => compra.pagar(comprador, reloj)).toThrow("La compra venció");
      expect(compra.estado).toBe(PENDIENTE);
    });

    test.each([CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA])(
      "no se puede pagar una compra %s",
      (estado) => {
        const { compra, reloj } = compraEn(estado);
        expect(() => compra.pagar(comprador, reloj)).toThrow(
          `No se puede pagar una compra ${estado}`,
        );
      },
    );
  });

  describe("PENDIENTE → CANCELADA (comprador)", () => {
    test("cancela, libera el cupo y no genera reembolso", () => {
      const { compra, evento, reloj } = crearCompra();
      compra.cancelar(evento, comprador, reloj);
      expect(compra.estado).toBe(CANCELADA);
      expect(compra.motivoCancelacion).toBe(MotivoCancelacion.CANCELADA_POR_COMPRADOR);
      expect(compra.reembolsoPendiente).toBe(false);
      expect(compra.fechaLimiteReembolso).toBeNull();
      expect(vip(evento).disponibles).toBe(10);
    });

    test("no se puede cancelar si el evento ya ocurrió", () => {
      const { compra, evento, reloj } = crearCompra();
      reloj.fijar(evento.fecha);
      expect(() => compra.cancelar(evento, comprador, reloj)).toThrow("ya ocurrió");
      expect(vip(evento).disponibles).toBe(8);
    });

    test("rechaza un evento que no es el de la compra", () => {
      const { compra, reloj } = crearCompra();
      const otro = crearEvento({ id: "otro-evento" });
      expect(() => compra.cancelar(otro, comprador, reloj)).toThrow("no corresponde");
    });
  });

  describe("PENDIENTE → CANCELADA (VENCIDA, sistema)", () => {
    test("vence en el borde exacto de las 48 h y libera el cupo", () => {
      const { compra, evento, reloj } = crearCompra();
      reloj.avanzar(48 * HORA);
      compra.vencer(evento, reloj);
      expect(compra.estado).toBe(CANCELADA);
      expect(compra.motivoCancelacion).toBe(MotivoCancelacion.VENCIDA);
      expect(vip(evento).disponibles).toBe(10);
      expect(compra.historial.at(-1)).toMatchObject({
        quien: { id: "SISTEMA", nombre: "Sistema", rol: "SISTEMA" },
        detalle: "Vencida: 48 h sin pago",
      });
    });

    test("no vence un milisegundo antes de las 48 h", () => {
      const { compra, evento, reloj } = crearCompra();
      reloj.avanzar(48 * HORA - 1);
      expect(() => compra.vencer(evento, reloj)).toThrow("todavía no venció");
      expect(compra.estado).toBe(PENDIENTE);
    });

    test("si el evento ocurre antes de las 48 h, vence a la hora del evento", () => {
      const fecha = new Date(AHORA.getTime() + 5 * HORA);
      const { compra, evento, reloj } = crearCompra({ evento: crearEvento({ fecha }) });
      reloj.fijar(fecha);
      compra.vencer(evento, reloj);
      expect(compra.historial.at(-1).detalle).toBe(
        "Vencida: el evento comenzó sin que se registrara el pago",
      );
    });

    test.each([CONFIRMADA, CANCELADA, UTILIZADA, REEMBOLSADA])(
      "no se puede vencer una compra %s",
      (estado) => {
        const { compra, evento, reloj } = compraEn(estado);
        reloj.avanzar(30 * DIA);
        expect(() => compra.vencer(evento, reloj)).toThrow(
          `No se puede vencer una compra ${estado}`,
        );
      },
    );
  });

  describe("CONFIRMADA → CANCELADA (comprador)", () => {
    test("libera cupo y deja un reembolso pendiente por 24 h", () => {
      const { compra, evento, reloj } = compraEn(CONFIRMADA);
      reloj.avanzar(2 * HORA);
      compra.cancelar(evento, comprador, reloj);
      expect(compra.estado).toBe(CANCELADA);
      expect(compra.reembolsoPendiente).toBe(true);
      expect(compra.fechaLimiteReembolso).toEqual(new Date(AHORA.getTime() + 26 * HORA));
      expect(vip(evento).disponibles).toBe(10);
      expect(compra.historial.at(-1).detalle).toBe(
        "Cancelada por el comprador; reembolso pendiente de $90.000,00",
      );
    });

    test("no se puede cancelar si el evento ya ocurrió", () => {
      const { compra, evento, reloj } = compraEn(CONFIRMADA);
      reloj.fijar(new Date(evento.fecha.getTime() + HORA));
      expect(() => compra.cancelar(evento, comprador, reloj)).toThrow(ConflictError);
    });

    test.each([UTILIZADA, CANCELADA, REEMBOLSADA])(
      "no se puede cancelar una compra %s (y no libera cupo dos veces)",
      (estado) => {
        const { compra, evento, reloj } = compraEn(estado);
        const disponibles = vip(evento).disponibles;
        expect(() => compra.cancelar(evento, comprador, reloj)).toThrow(
          `No se puede cancelar una compra ${estado}`,
        );
        expect(vip(evento).disponibles).toBe(disponibles);
      },
    );
  });

  describe("CANCELADA → REEMBOLSADA (organizador)", () => {
    test("reembolsa y apaga el reembolso pendiente", () => {
      const { compra, reloj } = compraEn("CANCELADA_PAGA");
      compra.reembolsar(organizador, reloj);
      expect(compra.estado).toBe(REEMBOLSADA);
      expect(compra.reembolsoPendiente).toBe(false);
      expect(compra.historial.at(-1)).toMatchObject({
        quien: { id: organizador.id, rol: "ORGANIZADOR" },
        detalle: "Reembolso de $90.000,00 realizado por el organizador",
      });
    });

    test("puede reembolsar aunque hayan pasado las 24 h (si el sistema aún no lo hizo)", () => {
      const { compra, reloj } = compraEn("CANCELADA_PAGA");
      reloj.avanzar(30 * HORA);
      compra.reembolsar(organizador, reloj);
      expect(compra.estado).toBe(REEMBOLSADA);
    });

    test("una cancelación sin pago no tiene reembolso", () => {
      const { compra, reloj } = compraEn(CANCELADA);
      expect(() => compra.reembolsar(organizador, reloj)).toThrow("reembolso pendiente");
    });

    test.each([PENDIENTE, CONFIRMADA, UTILIZADA, REEMBOLSADA])(
      "no se puede reembolsar una compra %s",
      (estado) => {
        const { compra, reloj } = compraEn(estado);
        expect(() => compra.reembolsar(organizador, reloj)).toThrow(
          `No se puede reembolsar una compra ${estado}`,
        );
      },
    );
  });

  describe("CANCELADA → REEMBOLSADA (automático, sistema)", () => {
    test("reembolsa en el borde exacto de las 24 h", () => {
      const { compra, reloj } = compraEn("CANCELADA_PAGA");
      reloj.avanzar(24 * HORA);
      compra.reembolsarAutomaticamente(reloj);
      expect(compra.estado).toBe(REEMBOLSADA);
      expect(compra.reembolsoPendiente).toBe(false);
      expect(compra.historial.at(-1)).toMatchObject({
        quien: { id: "SISTEMA" },
        detalle: "Reembolso automático: el organizador no reembolsó en 24 h",
      });
    });

    test("no reembolsa un milisegundo antes de las 24 h", () => {
      const { compra, reloj } = compraEn("CANCELADA_PAGA");
      reloj.avanzar(24 * HORA - 1);
      expect(() => compra.reembolsarAutomaticamente(reloj)).toThrow("todavía está a tiempo");
      expect(compra.estado).toBe(CANCELADA);
    });

    test("no reembolsa una cancelación sin pago", () => {
      const { compra, reloj } = compraEn(CANCELADA);
      reloj.avanzar(30 * HORA);
      expect(() => compra.reembolsarAutomaticamente(reloj)).toThrow("reembolso pendiente");
    });

    test("no reembolsa dos veces", () => {
      const { compra, reloj } = compraEn(REEMBOLSADA);
      reloj.avanzar(30 * HORA);
      expect(() => compra.reembolsarAutomaticamente(reloj)).toThrow(
        "No se puede reembolsar una compra REEMBOLSADA",
      );
    });
  });

  describe("CONFIRMADA → UTILIZADA (sistema)", () => {
    test("se marca utilizada desde el instante del evento", () => {
      const { compra, evento, reloj } = compraEn(CONFIRMADA);
      reloj.fijar(evento.fecha);
      compra.marcarUtilizada(evento, reloj);
      expect(compra.estado).toBe(UTILIZADA);
      expect(compra.historial.at(-1).quien.id).toBe("SISTEMA");
    });

    test("no se marca utilizada antes del evento", () => {
      const { compra, evento, reloj } = compraEn(CONFIRMADA);
      reloj.fijar(new Date(evento.fecha.getTime() - 1));
      expect(() => compra.marcarUtilizada(evento, reloj)).toThrow("todavía no ocurrió");
    });

    test.each([PENDIENTE, CANCELADA, REEMBOLSADA, UTILIZADA])(
      "no se puede marcar como utilizada una compra %s",
      (estado) => {
        const { compra, evento, reloj } = compraEn(estado);
        reloj.fijar(new Date(evento.fecha.getTime() + DIA));
        expect(() => compra.marcarUtilizada(evento, reloj)).toThrow(
          `No se puede marcar como utilizada una compra ${estado}`,
        );
      },
    );
  });

  test("el historial completo de un flujo feliz queda en orden", () => {
    const { compra } = compraEn(UTILIZADA);
    expect(compra.historial.map((c) => c.estadoNuevo)).toEqual([PENDIENTE, CONFIRMADA, UTILIZADA]);
  });

  describe("consultas", () => {
    test("diasParaElEvento redondea hacia arriba y solo aplica a CONFIRMADA", () => {
      const { compra, evento, reloj } = crearCompra();
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBeNull();
      compra.pagar(comprador, reloj);
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBe(10);
      reloj.avanzar(HORA);
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBe(10);
      reloj.fijar(new Date(evento.fecha.getTime() - DIA));
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBe(1);
      reloj.fijar(evento.fecha);
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBe(0);
      reloj.avanzar(DIA);
      expect(compra.diasParaElEvento(evento.fecha, reloj)).toBe(0);
    });

    test("puedePagar", () => {
      const { compra, reloj } = crearCompra();
      expect(compra.puedePagar(reloj)).toBe(true);
      reloj.avanzar(48 * HORA);
      expect(compra.puedePagar(reloj)).toBe(false);
      expect(compraEn(CONFIRMADA).compra.puedePagar(relojFijo())).toBe(false);
    });

    test.each([
      [PENDIENTE, true],
      [CONFIRMADA, true],
      [CANCELADA, false],
      [UTILIZADA, false],
      [REEMBOLSADA, false],
    ])("puedeCancelar en %s antes del evento = %p", (estado, esperado) => {
      const { compra, evento } = compraEn(estado);
      expect(compra.puedeCancelar(evento.fecha, relojFijo())).toBe(esperado);
    });

    test("puedeCancelar es false una vez que el evento ocurrió", () => {
      const { compra, evento } = compraEn(CONFIRMADA);
      expect(compra.puedeCancelar(evento.fecha, relojFijo(evento.fecha))).toBe(false);
    });

    test("puedeReseniar: UTILIZADA, comprador dueño y sin reseña previa", () => {
      const { compra } = compraEn(UTILIZADA);
      expect(compra.puedeReseniar(comprador.id)).toBe(true);
      expect(compra.puedeReseniar(otroComprador.id)).toBe(false);
      compra.reseniaId = "r1";
      expect(compra.puedeReseniar(comprador.id)).toBe(false);
      expect(compraEn(CONFIRMADA).compra.puedeReseniar(comprador.id)).toBe(false);
    });
  });

  describe("reseñas", () => {
    test("crea la reseña con los datos de la compra", () => {
      const { compra, reloj } = compraEn(UTILIZADA);
      const resenia = compra.crearResenia({
        comprador,
        puntuacion: 4.5,
        detalle: "  Excelente  ",
        reloj,
      });
      expect(resenia).toMatchObject({
        id: null,
        compraId: "compra-1",
        compradorId: comprador.id,
        compradorNombre: comprador.nombre,
        eventoId: "evento-1",
        organizadorId: organizador.id,
        tipoEntradaNombre: "VIP",
        puntuacion: 4.5,
        detalle: "Excelente",
      });
    });

    test("una reseña por compra", () => {
      const { compra, reloj } = compraEn(UTILIZADA);
      const resenia = compra.crearResenia({ comprador, puntuacion: 5, reloj });
      resenia.id = "r1";
      compra.registrarResenia(resenia);
      expect(compra.reseniaId).toBe("r1");
      expect(() => compra.crearResenia({ comprador, puntuacion: 4, reloj })).toThrow(
        "ya tiene una reseña",
      );
      expect(() => compra.registrarResenia({ ...resenia, id: "r2" })).toThrow(ConflictError);
    });

    /** Dos compras UTILIZADAS del mismo comprador y evento, con los tipos de entrada indicados. */
    function dosComprasUtilizadas(tipoA, tipoB) {
      const evento = crearEvento();
      const reloj = relojFijo();
      const compras = [tipoA, tipoB].map((tipoEntradaId, i) => {
        const compra = Compra.crear({ comprador, evento, tipoEntradaId, cantidad: 1, reloj });
        compra.id = `compra-${i + 1}`;
        compra.pagar(comprador, reloj);
        return compra;
      });
      reloj.fijar(evento.fecha);
      for (const compra of compras) compra.marcarUtilizada(evento, reloj);
      return { compras, reloj };
    }

    function reseniar(compra, reloj) {
      const resenia = compra.crearResenia({ comprador, puntuacion: 4, reloj });
      resenia.id = `resenia-${compra.id}`;
      compra.registrarResenia(resenia);
    }

    test.each([
      ["distinto tipo de entrada", "tipo-general", "tipo-vip"],
      ["el mismo tipo de entrada", "tipo-vip", "tipo-vip"],
    ])("la misma persona puede reseñar dos compras del mismo evento con %s", (_, tipoA, tipoB) => {
      const { compras, reloj } = dosComprasUtilizadas(tipoA, tipoB);
      for (const compra of compras) reseniar(compra, reloj);
      expect(compras.map((c) => c.reseniaId)).toEqual(["resenia-compra-1", "resenia-compra-2"]);
    });

    test("reseñar una compra no habilita una segunda reseña de esa misma compra", () => {
      const { compras, reloj } = dosComprasUtilizadas("tipo-vip", "tipo-vip");
      reseniar(compras[0], reloj);
      expect(() => reseniar(compras[0], reloj)).toThrow("ya tiene una reseña");
      expect(compras[1].puedeReseniar(comprador.id)).toBe(true);
    });

    test("solo el comprador dueño puede reseñar", () => {
      const { compra, reloj } = compraEn(UTILIZADA);
      expect(() => compra.crearResenia({ comprador: otroComprador, puntuacion: 5, reloj })).toThrow(
        ForbiddenError,
      );
      expect(() =>
        compra.registrarResenia({ id: "r", compraId: "compra-1", compradorId: otroComprador.id }),
      ).toThrow(ConflictError);
      expect(compra.reseniaId).toBeNull();
    });

    test.each([PENDIENTE, CONFIRMADA, CANCELADA, REEMBOLSADA])(
      "no se puede reseñar una compra %s",
      (estado) => {
        const { compra, reloj } = compraEn(estado);
        expect(() => compra.crearResenia({ comprador, puntuacion: 5, reloj })).toThrow(
          ConflictError,
        );
        expect(() =>
          compra.registrarResenia({ id: "r", compraId: "compra-1", compradorId: comprador.id }),
        ).toThrow(`No se puede reseñar una compra ${estado}`);
      },
    );

    test("registrarResenia exige una reseña guardada y de esta compra", () => {
      const { compra } = compraEn(UTILIZADA);
      expect(() =>
        compra.registrarResenia({ id: null, compraId: "compra-1", compradorId: comprador.id }),
      ).toThrow("guardada");
      expect(() =>
        compra.registrarResenia({ id: "r", compraId: "otra", compradorId: comprador.id }),
      ).toThrow("no corresponde");
    });
  });

  describe("chat", () => {
    test.each([CONFIRMADA, PENDIENTE, UTILIZADA, CANCELADA, REEMBOLSADA])(
      "el comprador y el organizador pueden escribir en estado %s",
      (estado) => {
        const { compra, reloj } = compraEn(estado);
        const m1 = compra.agregarMensaje(comprador, "  Hola  ", reloj);
        compra.agregarMensaje(organizador, "¡Hola!", reloj);
        expect(m1).toBeInstanceOf(Mensaje);
        expect(m1).toMatchObject({
          usuarioId: comprador.id,
          usuarioNombre: comprador.nombre,
          rol: "COMPRADOR",
          mensaje: "Hola",
        });
        expect(compra.mensajes).toHaveLength(2);
      },
    );

    test("mensajesNoLeidosPara cuenta los del otro participante posteriores a la última lectura", () => {
      const { compra, reloj } = crearCompra();
      compra.agregarMensaje(comprador, "Hola", reloj);
      reloj.avanzar(HORA);
      compra.agregarMensaje(organizador, "¡Hola!", reloj);
      reloj.avanzar(HORA);
      compra.agregarMensaje(organizador, "¿Algo más?", reloj);
      expect(compra.mensajesNoLeidosPara(comprador.id)).toBe(2);
      expect(compra.mensajesNoLeidosPara(organizador.id)).toBe(1);
      expect(compra.mensajesNoLeidosPara(comprador.id, new Date(AHORA.getTime() + HORA))).toBe(1);
      expect(compra.mensajesNoLeidosPara(comprador.id, reloj.ahora())).toBe(0);
    });

    test("otra persona no puede escribir", () => {
      const { compra, reloj } = crearCompra();
      expect(() => compra.agregarMensaje(otroComprador, "Hola", reloj)).toThrow(ForbiddenError);
      expect(() => compra.agregarMensaje(undefined, "Hola", reloj)).toThrow(ForbiddenError);
      expect(compra.mensajes).toEqual([]);
    });

    test("valida el largo del mensaje", () => {
      const { compra, reloj } = crearCompra();
      expect(() => compra.agregarMensaje(comprador, "   ", reloj)).toThrow("vacío");
      expect(() => compra.agregarMensaje(comprador, "x".repeat(1001), reloj)).toThrow("máximo");
      expect(compra.agregarMensaje(comprador, "x".repeat(1000), reloj).mensaje).toHaveLength(1000);
    });
  });

  describe("hidratación", () => {
    test("reconstruye una compra guardada con su historial y mensajes", () => {
      const { compra } = compraEn(CONFIRMADA);
      compra.agregarMensaje(comprador, "Hola", relojFijo());
      const copia = new Compra(JSON.parse(JSON.stringify(compra)));
      expect(copia.estado).toBe(CONFIRMADA);
      expect(copia.historial[1]).toBeInstanceOf(CambioEstadoCompra);
      expect(copia.mensajes[0]).toBeInstanceOf(Mensaje);
      expect(copia.fechaLimitePago).toEqual(compra.fechaLimitePago);
      expect(copia.activo).toBe(true);
    });

    test("rechaza un estado inválido", () => {
      const { compra } = crearCompra();
      expect(() => new Compra({ ...compra, estado: "PERDIDA" })).toThrow("estado");
    });

    test("un cambio de estado exige quién lo hizo y su rol", () => {
      const base = { estadoNuevo: PENDIENTE, fechaHora: AHORA };
      expect(() => new CambioEstadoCompra({ ...base, quien: undefined })).toThrow("quién");
      expect(() => new CambioEstadoCompra({ ...base, quien: { id: "x", nombre: "X" } })).toThrow(
        "rol",
      );
      expect(
        () => new CambioEstadoCompra({ ...base, estadoNuevo: "OTRO", quien: comprador }),
      ).toThrow("no es válido");
    });
  });
});

describe("Dominio Compra — cancelación del evento", () => {
  const quien = { id: organizador.id, nombre: organizador.nombre, rol: "ORGANIZADOR" };

  function conEventoCancelado(estado) {
    const datos = compraEn(estado);
    datos.evento.cancelar("La sala cerró", quien, datos.reloj);
    return datos;
  }

  test("PENDIENTE → CANCELADA con motivo EVENTO_CANCELADO y sin reembolso", () => {
    const { compra, evento, reloj } = conEventoCancelado(PENDIENTE);
    compra.aplicarCancelacionDelEvento(evento, quien, reloj);
    expect(compra.estado).toBe(CANCELADA);
    expect(compra.motivoCancelacion).toBe(MotivoCancelacion.EVENTO_CANCELADO);
    expect(compra.reembolsoPendiente).toBe(false);
    expect(compra.historial.at(-1).detalle).toBe(
      "Evento cancelado por el organizador: La sala cerró",
    );
  });

  test("CONFIRMADA → CANCELADA → REEMBOLSADA en el acto (reembolso automático del sistema)", () => {
    const { compra, evento, reloj } = conEventoCancelado(CONFIRMADA);
    compra.aplicarCancelacionDelEvento(evento, quien, reloj);
    expect(compra.estado).toBe(REEMBOLSADA);
    expect(compra.reembolsoPendiente).toBe(false);
    expect(compra.historial.slice(-2).map((c) => [c.estadoNuevo, c.quien.id])).toEqual([
      [CANCELADA, organizador.id],
      [REEMBOLSADA, ACTOR_SISTEMA.id],
    ]);
    expect(compra.historial.at(-1).detalle).toMatch(
      /Reembolso automático de .* por la cancelación del evento/,
    );
  });

  test("una CANCELADA con reembolso pendiente se reembolsa en el acto", () => {
    const { compra, evento, reloj } = conEventoCancelado("CANCELADA_PAGA");
    expect(compra.afectadaPorCancelacionDelEvento()).toBe(true);
    compra.aplicarCancelacionDelEvento(evento, quien, reloj);
    expect(compra.estado).toBe(REEMBOLSADA);
    expect(compra.motivoCancelacion).toBe(MotivoCancelacion.CANCELADA_POR_COMPRADOR);
  });

  test.each([[CANCELADA], [REEMBOLSADA]])("una %s ya resuelta no se toca (409)", (estado) => {
    const { compra, evento, reloj } = conEventoCancelado(estado);
    expect(compra.afectadaPorCancelacionDelEvento()).toBe(false);
    expect(() => compra.aplicarCancelacionDelEvento(evento, quien, reloj)).toThrow(ConflictError);
  });

  test("si el evento no está cancelado → 409; no se puede comprar un evento cancelado", () => {
    const { compra, evento, reloj } = compraEn(PENDIENTE);
    expect(() => compra.aplicarCancelacionDelEvento(evento, quien, reloj)).toThrow(
      "no está cancelado",
    );
    evento.cancelar("Lluvia", quien, reloj);
    expect(() =>
      Compra.crear({ comprador, evento, tipoEntradaId: "tipo-vip", cantidad: 1, reloj }),
    ).toThrow("fue cancelado");
  });
});

describe("Recordatorio de pago (spec 11)", () => {
  test("PENDIENTE con 24 h o menos para pagar y plazo total mayor a 24 h", () => {
    const { compra, reloj } = crearCompra(); // evento a +10 días: plazo de 48 h
    expect(compra.debeRecordarPago(reloj)).toBe(false); // faltan 48 h
    reloj.avanzar(24 * HORA - 1);
    expect(compra.debeRecordarPago(reloj)).toBe(false); // falta apenas más de 24 h
    reloj.avanzar(1);
    expect(compra.debeRecordarPago(reloj)).toBe(true); // exactamente 24 h
    reloj.avanzar(24 * HORA);
    expect(compra.debeRecordarPago(reloj)).toBe(false); // ya venció
  });

  test("no se recuerda dos veces ni fuera de PENDIENTE", () => {
    const { compra, reloj } = crearCompra();
    reloj.avanzar(30 * HORA);
    compra.marcarRecordatorioPagoEnviado();
    expect(compra.debeRecordarPago(reloj)).toBe(false);
    const pagada = compraEn(CONFIRMADA);
    pagada.reloj.avanzar(30 * HORA);
    expect(pagada.compra.debeRecordarPago(pagada.reloj)).toBe(false);
  });

  test("con el evento cerca (plazo ≤ 24 h) no se recuerda", () => {
    const evento = crearEvento({ fecha: new Date(AHORA.getTime() + 20 * HORA) });
    const { compra, reloj } = crearCompra({ evento });
    expect(compra.fechaLimitePago).toEqual(evento.fecha);
    reloj.avanzar(HORA);
    expect(compra.debeRecordarPago(reloj)).toBe(false);
  });

  test("el flag sobrevive a la rehidratación", () => {
    const { compra } = crearCompra();
    compra.marcarRecordatorioPagoEnviado();
    expect(new Compra(JSON.parse(JSON.stringify(compra))).recordatorioPagoEnviado).toBe(true);
  });
});
