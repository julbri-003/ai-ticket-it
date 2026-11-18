import { BadRequestError, ConflictError, ForbiddenError } from "../errors/AppError.js";
import { mismoId } from "../utils/id.js";
import { formatearMonto, redondearMonto } from "../utils/montos.js";
import { CambioEstadoCompra } from "./cambioEstadoCompraDominio.js";
import { ACTOR_SISTEMA, EstadoCompra, MotivoCancelacion } from "./estadoCompraDominio.js";
import { Mensaje } from "./mensajeDominio.js";
import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import { Resenia } from "./reseniaDominio.js";
import { Roles } from "./rolesDominio.js";
import { fechaValida, idObligatorio } from "./validaciones.js";

export const HORAS_PARA_PAGAR = 48;
export const HORAS_PARA_REEMBOLSAR = 24;
export const MAX_ENTRADAS_POR_COMPRA = 10;

const MS_POR_HORA = 60 * 60 * 1000;
const MS_POR_DIA = 24 * MS_POR_HORA;

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = EstadoCompra;

/**
 * Tabla de transiciones por disparador: desde qué estados se puede ejecutar cada acción y a
 * qué estado lleva. Indexarla por acción (y no solo por "desde → hacia") evita que, por
 * ejemplo, vencer() acepte una compra CONFIRMADA porque CONFIRMADA → CANCELADA es válido
 * para cancelar().
 */
const Accion = Object.freeze({
  PAGAR: "pagar",
  CANCELAR: "cancelar",
  CANCELAR_POR_EVENTO: "cancelar por evento cancelado",
  VENCER: "vencer",
  REEMBOLSAR: "reembolsar",
  MARCAR_UTILIZADA: "marcar como utilizada",
});

const TRANSICIONES = Object.freeze({
  [Accion.PAGAR]: { desde: [PENDIENTE], hacia: CONFIRMADA },
  [Accion.CANCELAR]: { desde: [PENDIENTE, CONFIRMADA], hacia: CANCELADA },
  [Accion.CANCELAR_POR_EVENTO]: { desde: [PENDIENTE, CONFIRMADA], hacia: CANCELADA },
  [Accion.VENCER]: { desde: [PENDIENTE], hacia: CANCELADA },
  [Accion.REEMBOLSAR]: { desde: [CANCELADA], hacia: REEMBOLSADA },
  [Accion.MARCAR_UTILIZADA]: { desde: [CONFIRMADA], hacia: UTILIZADA },
});

// ----- Funciones privadas del módulo -----
// Fuera de la clase (no #privadas): los documentos de mongoose cargados con loadClass
// no son instancias reales y no pueden acceder a miembros #privados.

/**
 * Único punto por el que cambia el estado: valida la transición contra la tabla y agrega
 * el CambioEstadoCompra al historial.
 */
function actualizarEstado(compra, { accion, quien, detalle, reloj }) {
  exigirTransicion(compra, accion);
  const nuevo = TRANSICIONES[accion].hacia;
  compra.historial.push(
    new CambioEstadoCompra({
      estadoAnterior: compra.estado,
      estadoNuevo: nuevo,
      quien,
      fechaHora: reloj.ahora(),
      detalle,
    }),
  );
  compra.estado = nuevo;
}

/** Antes de chequear condiciones de negocio, rechaza las transiciones que la tabla no admite. */
function exigirTransicion(compra, accion) {
  if (!TRANSICIONES[accion].desde.includes(compra.estado)) {
    throw new ConflictError(`No se puede ${accion} una compra ${compra.estado}`);
  }
}

function exigirEventoDeLaCompra(compra, evento) {
  if (!evento || !mismoId(evento, compra.eventoId)) {
    throw new BadRequestError("El evento indicado no corresponde a la compra");
  }
}

function liberarCupo(compra, evento) {
  evento.buscarTipoEntrada(compra.tipoEntradaId).liberar(compra.cantidad);
}

function lecturaGuardada(compra, usuarioId) {
  if (mismoId(compra.compradorId, usuarioId)) return compra.ultimaLecturaComprador;
  if (mismoId(compra.organizadorId, usuarioId)) return compra.ultimaLecturaOrganizador;
  return null;
}

function exigirCantidad(cantidad) {
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_ENTRADAS_POR_COMPRA) {
    throw new BadRequestError(
      `La cantidad de entradas debe ser un entero entre 1 y ${MAX_ENTRADAS_POR_COMPRA}`,
    );
  }
}

function ahoraMs(reloj) {
  return reloj.ahora().getTime();
}

export class Compra extends Persistible {
  constructor({
    id = null,
    compradorId,
    eventoId,
    organizadorId,
    tipoEntradaId,
    tipoEntradaNombre,
    precioUnitario,
    cantidad,
    total,
    estado = PENDIENTE,
    historial = [],
    mensajes = [],
    fechaCompra,
    fechaLimitePago,
    motivoCancelacion = null,
    reembolsoPendiente = false,
    fechaLimiteReembolso = null,
    reseniaId = null,
    ultimaLecturaComprador = null,
    ultimaLecturaOrganizador = null,
    recordatorioEnviado = false,
    recordatorioPagoEnviado = false,
    activo,
    fechaModificacion,
    modificadoPor,
  }) {
    super();
    exigirCantidad(cantidad);
    if (!Object.values(EstadoCompra).includes(estado)) {
      throw new BadRequestError("El estado de la compra no es válido");
    }

    this.id = id;
    this.compradorId = idObligatorio(compradorId, "La compra debe tener un comprador");
    this.eventoId = idObligatorio(eventoId, "La compra debe pertenecer a un evento");
    this.organizadorId = idObligatorio(organizadorId, "La compra debe tener un organizador");
    this.tipoEntradaId = idObligatorio(tipoEntradaId, "La compra debe tener un tipo de entrada");
    this.tipoEntradaNombre = tipoEntradaNombre;
    this.precioUnitario = redondearMonto(precioUnitario);
    this.cantidad = cantidad;
    this.total = redondearMonto(total ?? this.precioUnitario * cantidad);
    this.estado = estado;
    this.historial = historial.map((c) =>
      c instanceof CambioEstadoCompra ? c : new CambioEstadoCompra(c),
    );
    this.mensajes = mensajes.map((m) => (m instanceof Mensaje ? m : new Mensaje(m)));
    this.fechaCompra = fechaValida(fechaCompra, "La compra debe tener una fecha válida");
    this.fechaLimitePago = fechaValida(
      fechaLimitePago,
      "La compra debe tener una fecha límite de pago válida",
    );
    this.motivoCancelacion = motivoCancelacion;
    this.reembolsoPendiente = reembolsoPendiente;
    this.fechaLimiteReembolso = fechaLimiteReembolso ? new Date(fechaLimiteReembolso) : null;
    this.reseniaId = reseniaId;
    this.ultimaLecturaComprador = ultimaLecturaComprador ? new Date(ultimaLecturaComprador) : null;
    this.ultimaLecturaOrganizador = ultimaLecturaOrganizador
      ? new Date(ultimaLecturaOrganizador)
      : null;
    this.recordatorioEnviado = recordatorioEnviado;
    this.recordatorioPagoEnviado = recordatorioPagoEnviado;

    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }

  /**
   * — → PENDIENTE. El precio sale del evento (nunca del cliente) y reserva el cupo en el
   * tipo de entrada. fechaLimitePago = min(fechaCompra + 48 h, fecha del evento).
   */
  static crear({ comprador, evento, tipoEntradaId, cantidad, reloj }) {
    if (comprador?.rol !== Roles.COMPRADOR) {
      throw new ForbiddenError("Solo los compradores pueden comprar entradas");
    }
    if (evento.estaCancelado()) {
      throw new BadRequestError("El evento fue cancelado: no se pueden comprar entradas");
    }
    if (!evento.activo || evento.yaOcurrio(reloj)) {
      throw new BadRequestError("El evento ya ocurrió: no se pueden comprar entradas");
    }
    exigirCantidad(cantidad);

    const tipo = evento.buscarTipoEntrada(tipoEntradaId);
    tipo.reservar(cantidad);

    const fechaCompra = reloj.ahora();
    const fechaLimitePago = new Date(
      Math.min(fechaCompra.getTime() + HORAS_PARA_PAGAR * MS_POR_HORA, evento.fecha.getTime()),
    );
    const total = redondearMonto(tipo.precio * cantidad);

    const compra = new Compra({
      compradorId: comprador.id,
      eventoId: evento.id,
      organizadorId: evento.organizadorId,
      tipoEntradaId: tipo.id,
      tipoEntradaNombre: tipo.nombre,
      precioUnitario: tipo.precio,
      cantidad,
      total,
      fechaCompra,
      fechaLimitePago,
    });
    compra.historial.push(
      new CambioEstadoCompra({
        estadoAnterior: null,
        estadoNuevo: PENDIENTE,
        quien: comprador,
        fechaHora: fechaCompra,
        detalle: `Compra de ${cantidad} × ${tipo.nombre} por ${formatearMonto(total)}`,
      }),
    );
    return compra;
  }

  // ----- Transiciones -----

  /** PENDIENTE → CONFIRMADA (pago simulado), solo antes de la fecha límite de pago. */
  pagar(quien, reloj) {
    exigirTransicion(this, Accion.PAGAR);
    if (ahoraMs(reloj) >= this.fechaLimitePago.getTime()) {
      throw new ConflictError("La compra venció");
    }
    actualizarEstado(this, {
      accion: Accion.PAGAR,
      quien,
      detalle: `Pago confirmado por ${formatearMonto(this.total)}`,
      reloj,
    });
  }

  /**
   * PENDIENTE o CONFIRMADA → CANCELADA por el comprador, solo si el evento no ocurrió.
   * Libera el cupo. Si estaba CONFIRMADA queda un reembolso pendiente por 24 h.
   */
  cancelar(evento, quien, reloj) {
    exigirTransicion(this, Accion.CANCELAR);
    exigirEventoDeLaCompra(this, evento);
    if (evento.yaOcurrio(reloj)) {
      throw new ConflictError("No se puede cancelar: el evento ya ocurrió");
    }
    const estabaConfirmada = this.estado === CONFIRMADA;
    actualizarEstado(this, {
      accion: Accion.CANCELAR,
      quien,
      detalle: estabaConfirmada
        ? `Cancelada por el comprador; reembolso pendiente de ${formatearMonto(this.total)}`
        : "Cancelada por el comprador antes de pagar",
      reloj,
    });
    this.motivoCancelacion = MotivoCancelacion.CANCELADA_POR_COMPRADOR;
    if (estabaConfirmada) {
      this.reembolsoPendiente = true;
      this.fechaLimiteReembolso = new Date(ahoraMs(reloj) + HORAS_PARA_REEMBOLSAR * MS_POR_HORA);
    }
    liberarCupo(this, evento);
  }

  /** PENDIENTE → CANCELADA (VENCIDA) por el sistema cuando llega la fecha límite de pago. */
  vencer(evento, reloj) {
    exigirTransicion(this, Accion.VENCER);
    exigirEventoDeLaCompra(this, evento);
    if (ahoraMs(reloj) < this.fechaLimitePago.getTime()) {
      throw new ConflictError("La compra todavía no venció");
    }
    const limitePorPlazo = this.fechaCompra.getTime() + HORAS_PARA_PAGAR * MS_POR_HORA;
    actualizarEstado(this, {
      accion: Accion.VENCER,
      quien: ACTOR_SISTEMA,
      detalle:
        this.fechaLimitePago.getTime() < limitePorPlazo
          ? "Vencida: el evento comenzó sin que se registrara el pago"
          : `Vencida: ${HORAS_PARA_PAGAR} h sin pago`,
      reloj,
    });
    this.motivoCancelacion = MotivoCancelacion.VENCIDA;
    liberarCupo(this, evento);
  }

  /** CANCELADA con reembolso pendiente → REEMBOLSADA por el organizador. */
  reembolsar(quien, reloj) {
    exigirTransicion(this, Accion.REEMBOLSAR);
    if (!this.reembolsoPendiente) {
      throw new ConflictError("La compra no tiene un reembolso pendiente");
    }
    actualizarEstado(this, {
      accion: Accion.REEMBOLSAR,
      quien,
      detalle: `Reembolso de ${formatearMonto(this.total)} realizado por el organizador`,
      reloj,
    });
    this.reembolsoPendiente = false;
  }

  /** CANCELADA con reembolso pendiente → REEMBOLSADA por el sistema al vencer las 24 h. */
  reembolsarAutomaticamente(reloj) {
    exigirTransicion(this, Accion.REEMBOLSAR);
    if (!this.reembolsoPendiente) {
      throw new ConflictError("La compra no tiene un reembolso pendiente");
    }
    if (ahoraMs(reloj) < this.fechaLimiteReembolso.getTime()) {
      throw new ConflictError("El organizador todavía está a tiempo de reembolsar");
    }
    actualizarEstado(this, {
      accion: Accion.REEMBOLSAR,
      quien: ACTOR_SISTEMA,
      detalle: `Reembolso automático: el organizador no reembolsó en ${HORAS_PARA_REEMBOLSAR} h`,
      reloj,
    });
    this.reembolsoPendiente = false;
  }

  /** true si la cancelación del evento todavía tiene que resolver esta compra. */
  afectadaPorCancelacionDelEvento() {
    return (
      TRANSICIONES[Accion.CANCELAR_POR_EVENTO].desde.includes(this.estado) ||
      (this.estado === CANCELADA && this.reembolsoPendiente)
    );
  }

  /**
   * El evento se canceló: PENDIENTE → CANCELADA; CONFIRMADA → CANCELADA → REEMBOLSADA en el
   * acto (reembolso automático); una CANCELADA con reembolso pendiente → REEMBOLSADA.
   * Todo queda en el historial con el motivo.
   */
  aplicarCancelacionDelEvento(evento, quien, reloj) {
    exigirEventoDeLaCompra(this, evento);
    if (!evento.estaCancelado()) {
      throw new ConflictError("El evento no está cancelado");
    }
    if (!this.afectadaPorCancelacionDelEvento()) {
      throw new ConflictError(`No se puede cancelar por evento una compra ${this.estado}`);
    }
    const { motivo } = evento.cancelacion;
    if (this.estado !== CANCELADA) {
      const estabaConfirmada = this.estado === CONFIRMADA;
      actualizarEstado(this, {
        accion: Accion.CANCELAR_POR_EVENTO,
        quien,
        detalle: `Evento cancelado por el organizador: ${motivo}`,
        reloj,
      });
      this.motivoCancelacion = MotivoCancelacion.EVENTO_CANCELADO;
      this.reembolsoPendiente = estabaConfirmada;
    }
    if (this.reembolsoPendiente) {
      actualizarEstado(this, {
        accion: Accion.REEMBOLSAR,
        quien: ACTOR_SISTEMA,
        detalle: `Reembolso automático de ${formatearMonto(this.total)} por la cancelación del evento`,
        reloj,
      });
      this.reembolsoPendiente = false;
    }
  }

  /** CONFIRMADA → UTILIZADA por el sistema cuando el evento ya ocurrió. Habilita la reseña. */
  marcarUtilizada(evento, reloj) {
    exigirTransicion(this, Accion.MARCAR_UTILIZADA);
    exigirEventoDeLaCompra(this, evento);
    if (!evento.yaOcurrio(reloj)) {
      throw new ConflictError("El evento todavía no ocurrió");
    }
    actualizarEstado(this, {
      accion: Accion.MARCAR_UTILIZADA,
      quien: ACTOR_SISTEMA,
      detalle: "El evento ocurrió: entrada utilizada",
      reloj,
    });
  }

  // ----- Consultas -----

  /** Días que faltan para el evento (redondeo hacia arriba). Solo CONFIRMADA; si no, null. */
  diasParaElEvento(eventoFecha, reloj) {
    if (this.estado !== CONFIRMADA) return null;
    const diferencia = new Date(eventoFecha).getTime() - ahoraMs(reloj);
    return Math.max(0, Math.ceil(diferencia / MS_POR_DIA));
  }

  puedeCancelar(eventoFecha, reloj) {
    return (
      TRANSICIONES[Accion.CANCELAR].desde.includes(this.estado) &&
      ahoraMs(reloj) < new Date(eventoFecha).getTime()
    );
  }

  puedePagar(reloj) {
    return this.estado === PENDIENTE && ahoraMs(reloj) < this.fechaLimitePago.getTime();
  }

  esDe(usuarioId) {
    return mismoId(this.compradorId, usuarioId);
  }

  puedeReseniar(usuarioId) {
    return this.estado === UTILIZADA && this.esDe(usuarioId) && this.reseniaId == null;
  }

  // ----- Reseña -----

  /** Crea la reseña de esta compra validando que se pueda reseñar (aún sin id). */
  crearResenia({ comprador, puntuacion, detalle, reloj }) {
    if (!this.esDe(comprador?.id)) {
      throw new ForbiddenError("Solo el comprador de la compra puede reseñarla");
    }
    if (this.reseniaId != null) {
      throw new ConflictError("Esta compra ya tiene una reseña");
    }
    if (this.estado !== UTILIZADA) {
      throw new ConflictError(`No se puede reseñar una compra ${this.estado}`);
    }
    return new Resenia({
      compraId: this.id,
      compradorId: this.compradorId,
      compradorNombre: comprador.nombre,
      eventoId: this.eventoId,
      organizadorId: this.organizadorId,
      tipoEntradaNombre: this.tipoEntradaNombre,
      puntuacion,
      detalle,
      fecha: reloj.ahora(),
    });
  }

  /** Vincula la reseña ya guardada. Una sola reseña por compra. */
  registrarResenia(resenia) {
    if (this.reseniaId != null) {
      throw new ConflictError("Esta compra ya tiene una reseña");
    }
    if (resenia?.id == null) {
      throw new BadRequestError("La reseña debe estar guardada antes de vincularse");
    }
    if (!mismoId(resenia.compraId, this.id)) {
      throw new BadRequestError("La reseña no corresponde a esta compra");
    }
    if (!this.puedeReseniar(resenia.compradorId)) {
      throw new ConflictError(`No se puede reseñar una compra ${this.estado}`);
    }
    this.reseniaId = resenia.id;
  }

  // ----- Chat -----

  esParticipante(usuarioId) {
    return mismoId(this.compradorId, usuarioId) || mismoId(this.organizadorId, usuarioId);
  }

  /** Campo de la última lectura del participante ("ultimaLecturaComprador" | "ultimaLecturaOrganizador"). */
  campoLecturaDe(usuarioId) {
    if (mismoId(this.compradorId, usuarioId)) return "ultimaLecturaComprador";
    if (mismoId(this.organizadorId, usuarioId)) return "ultimaLecturaOrganizador";
    throw new ForbiddenError("Solo el comprador y el organizador pueden usar este chat");
  }

  /** Registra que el participante leyó el chat hasta ahora. La marca nunca retrocede. */
  registrarLectura(usuarioId, reloj) {
    const campo = this.campoLecturaDe(usuarioId);
    const ahora = reloj.ahora();
    if (!this[campo] || this[campo] < ahora) this[campo] = ahora;
    return { campo, fecha: this[campo] };
  }

  /**
   * Mensajes del otro participante posteriores a la última lectura de `usuarioId`
   * (la guardada en la compra, salvo que se indique otra). Sin lectura, cuentan todos.
   */
  mensajesNoLeidosPara(usuarioId, ultimaLectura = lecturaGuardada(this, usuarioId)) {
    const desde = ultimaLectura ? new Date(ultimaLectura).getTime() : -Infinity;
    return this.mensajes.filter(
      (m) => !mismoId(m.usuarioId, usuarioId) && m.enviado.getTime() > desde,
    ).length;
  }

  // ----- Recordatorio 24 h antes del evento -----

  /** CONFIRMADA, sin recordatorio previo y con el evento dentro de las próximas 24 h. */
  debeRecordarse(eventoFecha, reloj) {
    const faltan = new Date(eventoFecha).getTime() - ahoraMs(reloj);
    return (
      this.estado === CONFIRMADA && !this.recordatorioEnviado && faltan > 0 && faltan <= MS_POR_DIA
    );
  }

  marcarRecordatorioEnviado() {
    this.recordatorioEnviado = true;
  }

  // ----- Recordatorio de pago (24 h antes de que venza la reserva) -----

  /**
   * PENDIENTE, sin recordatorio de pago previo, con 24 h o menos para la fecha límite (sin
   * vencer) y con un plazo total mayor a 24 h: si el plazo ya era corto (evento muy cercano),
   * el comprador lo vio al reservar y no se le recuerda.
   */
  debeRecordarPago(reloj) {
    const limite = this.fechaLimitePago.getTime();
    const faltan = limite - ahoraMs(reloj);
    const plazo = limite - this.fechaCompra.getTime();
    return (
      this.estado === PENDIENTE &&
      !this.recordatorioPagoEnviado &&
      faltan > 0 &&
      faltan <= MS_POR_DIA &&
      plazo > MS_POR_DIA
    );
  }

  marcarRecordatorioPagoEnviado() {
    this.recordatorioPagoEnviado = true;
  }

  /** Solo el comprador o el organizador del evento, en cualquier estado de la compra. */
  agregarMensaje(usuario, texto, reloj) {
    if (!this.esParticipante(usuario?.id)) {
      throw new ForbiddenError("Solo el comprador y el organizador pueden usar este chat");
    }
    const mensaje = new Mensaje({
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      rol: usuario.rol,
      mensaje: texto,
      enviado: reloj.ahora(),
    });
    this.mensajes.push(mensaje);
    return mensaje;
  }
}
