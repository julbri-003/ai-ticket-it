import { Compra } from "../domain/compraDominio.js";
import { ACTOR_SISTEMA, EstadoCompra, MotivoCancelacion } from "../domain/estadoCompraDominio.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { mismoId } from "../utils/id.js";

const { PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA } = EstadoCompra;
const REINTENTOS_PUNTAJE = 3;

/** Quien ejecuta una acción, tal como queda en el historial ({ id, nombre, rol } del JWT). */
const actorDe = (usuario) => ({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });

/**
 * Casos de uso de compras. Toda transición pasa por el dominio (Compra) y se persiste con
 * control optimista: guardarTransicion(compra, estadoAnterior) solo escribe si nadie cambió la
 * compra mientras tanto. El cupo se libera recién después de ese guardado, así un mismo
 * vencimiento o cancelación aplicados en paralelo (job + petición) no lo liberan dos veces.
 *
 * Evaluación perezosa: antes de devolver una compra u operar sobre ella se aplican las
 * transiciones automáticas pendientes (vencer, marcar utilizada, reembolso automático).
 */
export class ComprasService {
  constructor({
    comprasRepository,
    eventosRepository,
    usuariosRepository,
    reseniasRepository,
    reloj,
    alCambiarEstado = null,
    alReseniar = null,
    alRecordarEvento = null,
    alRecordarPago = null,
    log = console,
  }) {
    this.comprasRepository = comprasRepository;
    this.eventosRepository = eventosRepository;
    this.usuariosRepository = usuariosRepository;
    this.reseniasRepository = reseniasRepository;
    this.reloj = reloj;
    // Hook para la iteración 06 (notificaciones y sockets): (compra, cambio) => void.
    this.alCambiarEstado = alCambiarEstado;
    this.alReseniar = alReseniar;
    this.alRecordarEvento = alRecordarEvento;
    this.alRecordarPago = alRecordarPago;
    this.log = log;
  }

  // ----- Casos de uso del comprador -----

  /** — → PENDIENTE. El precio sale del evento. Reserva atómica + compensación si falla el guardado. */
  async crear(usuario, { eventoId, tipoEntradaId, cantidad }) {
    const evento = await this.#obtenerEvento(eventoId);
    // El dominio valida evento activo y futuro, tipo existente, cantidad y cupo (en memoria).
    const compra = Compra.crear({
      comprador: actorDe(usuario),
      evento,
      tipoEntradaId,
      cantidad,
      reloj: this.reloj,
    });
    // La base es la que garantiza que no haya sobreventa.
    await this.eventosRepository.reservarCupo(evento.id, tipoEntradaId, cantidad);
    let guardada;
    try {
      guardada = await this.comprasRepository.guardar(compra);
    } catch (error) {
      await this.eventosRepository.liberarCupo(evento.id, tipoEntradaId, cantidad);
      throw error;
    }
    await this.#notificar(guardada);
    return { compra: guardada, evento: await this.#obtenerEvento(eventoId) };
  }

  /** Compras del comprador, actualizadas. Próximas primero; después las de eventos pasados. */
  async listarMias(usuario, { estado } = {}) {
    const compras = await this.comprasRepository.listarPorComprador(usuario.id);
    const eventos = await this.#eventosPorId(compras.map((c) => c.eventoId));
    const actualizadas = [];
    for (const compra of compras) {
      const evento = eventos.get(compra.eventoId);
      actualizadas.push({ compra: await this.#actualizar(compra, evento), evento });
    }
    const ahora = this.reloj.ahora().getTime();
    return actualizadas
      .filter(({ compra }) => !estado || compra.estado === estado)
      .sort((a, b) => {
        const fa = a.evento.fecha.getTime();
        const fb = b.evento.fecha.getTime();
        const futuraA = fa > ahora;
        const futuraB = fb > ahora;
        if (futuraA !== futuraB) return futuraA ? -1 : 1;
        return futuraA ? fa - fb : fb - fa;
      });
  }

  /** Detalle para el comprador dueño o el organizador del evento. */
  async detalle(id, usuario) {
    const compra = await this.#obtenerCompra(id);
    if (!compra.esParticipante(usuario.id)) {
      throw new ForbiddenError(
        "Solo el comprador o el organizador del evento pueden ver esta compra",
      );
    }
    const evento = await this.#obtenerEvento(compra.eventoId);
    const actualizada = await this.#actualizar(compra, evento);
    const resenia = actualizada.reseniaId
      ? await this.reseniasRepository.obtenerPorId(actualizada.reseniaId, {
          incluirInactivos: true,
        })
      : null;
    return { compra: actualizada, evento, resenia };
  }

  /** PENDIENTE → CONFIRMADA (pago simulado). Si ya venció, primero se vence y se responde 409. */
  async pagar(id, usuario) {
    const { compra, evento } = await this.#propiaDelComprador(id, usuario);
    if (compra.estado === CANCELADA && compra.motivoCancelacion === MotivoCancelacion.VENCIDA) {
      throw new ConflictError("La compra venció");
    }
    return this.#transicion(compra, evento, (c) => c.pagar(actorDe(usuario), this.reloj));
  }

  /** PENDIENTE/CONFIRMADA → CANCELADA. Libera cupo; si estaba paga queda el reembolso pendiente. */
  async cancelar(id, usuario) {
    const { compra, evento } = await this.#propiaDelComprador(id, usuario);
    return this.#transicion(compra, evento, (c) =>
      c.cancelar(evento, actorDe(usuario), this.reloj),
    );
  }

  /** CANCELADA con reembolso pendiente → REEMBOLSADA, por el organizador del evento. */
  async reembolsar(id, usuario) {
    const compra = await this.#obtenerCompra(id);
    if (!mismoId(compra.organizadorId, usuario.id)) {
      throw new ForbiddenError("Solo el organizador del evento puede reembolsar esta compra");
    }
    const evento = await this.#obtenerEvento(compra.eventoId);
    const actualizada = await this.#actualizar(compra, evento);
    if (
      actualizada.estado === REEMBOLSADA &&
      actualizada.historial.at(-1).quien.id === ACTOR_SISTEMA.id
    ) {
      throw new ConflictError("La compra ya fue reembolsada automáticamente");
    }
    return this.#transicion(actualizada, evento, (c) => c.reembolsar(actorDe(usuario), this.reloj));
  }

  /**
   * Reseña de una compra UTILIZADA, en una misma operación lógica:
   * 1) crea la reseña (índice único: una por compra), 2) actualiza el puntaje del organizador,
   * 3) la vincula a la compra. Si falla el paso 2, se borra la reseña (compensación).
   */
  async reseniar(id, usuario, { puntuacion, detalle }) {
    const { compra, evento } = await this.#propiaDelComprador(id, usuario);
    const resenia = await this.reseniasRepository.crear(
      compra.crearResenia({ comprador: actorDe(usuario), puntuacion, detalle, reloj: this.reloj }),
    );
    try {
      await this.#sumarAlPuntaje(compra.organizadorId, resenia.puntuacion);
    } catch (error) {
      await this.reseniasRepository.eliminar(resenia.id);
      throw error;
    }
    compra.registrarResenia(resenia);
    const guardada =
      (await this.comprasRepository.guardarSi(compra, { reseniaId: null })) ?? compra;
    await this.#avisar("alReseniar", guardada, resenia);
    return { compra: guardada, evento, resenia };
  }

  // ----- Organizador -----

  /** Compras de un evento con el resumen de ocupación y recaudación (caso de uso 2). */
  async resumenDeEvento(eventoId, usuario, { estado } = {}) {
    const evento = await this.#obtenerEvento(eventoId);
    if (!mismoId(evento.organizadorId, usuario.id)) {
      throw new ForbiddenError("Solo el organizador del evento puede ver sus compras");
    }
    const compras = [];
    for (const compra of await this.comprasRepository.listarPorEvento(evento.id)) {
      compras.push(await this.#actualizar(compra, evento));
    }
    // El cupo pudo cambiar al aplicar vencimientos: se relee el evento.
    const eventoActual = await this.#obtenerEvento(eventoId);
    const compradores = new Map(
      (await this.usuariosRepository.obtenerVarios(compras.map((c) => c.compradorId))).map((u) => [
        u.id,
        u,
      ]),
    );

    const porEstado = Object.fromEntries(Object.values(EstadoCompra).map((e) => [e, 0]));
    for (const c of compras) porEstado[c.estado] += 1;
    const recaudacionConfirmada = compras
      .filter((c) => [CONFIRMADA, UTILIZADA].includes(c.estado))
      .reduce((suma, c) => suma + c.total, 0);

    return {
      evento: eventoActual,
      resumen: {
        tiposEntrada: eventoActual.tiposEntrada.map((t) => ({
          id: t.id,
          nombre: t.nombre,
          cupo: t.cupo,
          vendidas: t.vendidas,
          disponibles: t.disponibles,
        })),
        porEstado,
        recaudacionConfirmada: Math.round(recaudacionConfirmada * 100) / 100,
        reembolsosPendientes: compras
          .filter((c) => c.estado === CANCELADA && c.reembolsoPendiente)
          .map((c) => ({
            compraId: c.id,
            total: c.total,
            fechaLimiteReembolso: c.fechaLimiteReembolso,
          })),
      },
      compras: compras
        .filter((c) => !estado || c.estado === estado)
        .map((compra) => ({ compra, comprador: compradores.get(compra.compradorId) ?? null })),
    };
  }

  /**
   * El organizador canceló el evento: cada compra activa se cancela y, si estaba paga (o tenía
   * un reembolso pendiente), se reembolsa en el acto. Un error en una compra no frena a las
   * demás; la evaluación perezosa la resuelve la próxima vez que se lea.
   * Devuelve cuántas compras se resolvieron.
   */
  async resolverCancelacionDeEvento(evento, quien) {
    let resueltas = 0;
    for (const compra of await this.comprasRepository.listarPorEvento(evento.id)) {
      if (!compra.afectadaPorCancelacionDelEvento()) continue;
      try {
        await this.#transicion(compra, evento, (c) =>
          c.aplicarCancelacionDelEvento(evento, quien, this.reloj),
        );
        resueltas += 1;
      } catch (error) {
        this.log.error?.(`No se pudo cancelar la compra ${compra.id}: ${error.message}`);
      }
    }
    return resueltas;
  }

  // ----- Tareas programadas (las orquesta jobs/ProgramadorTareas) -----

  async vencerComprasPendientes() {
    return this.#procesar(
      await this.comprasRepository.listarPendientesVencidas(this.reloj.ahora()),
    );
  }

  async marcarComprasUtilizadas() {
    return this.#procesar(
      await this.comprasRepository.listarConfirmadasDeEventosOcurridos(this.reloj.ahora()),
    );
  }

  /**
   * Recordatorio 24 h antes del evento a cada compra CONFIRMADA, una sola vez: el flag
   * recordatorioEnviado se guarda con condición, así dos corridas no avisan dos veces.
   */
  async recordarEventosProximos() {
    const compras = await this.comprasRepository.listarParaRecordatorio(this.reloj.ahora());
    const eventos = await this.#eventosPorId(compras.map((c) => c.eventoId));
    let enviados = 0;
    for (const compra of compras) {
      const evento = eventos.get(compra.eventoId);
      if (!evento || !compra.debeRecordarse(evento.fecha, this.reloj)) continue;
      compra.marcarRecordatorioEnviado();
      const guardada = await this.comprasRepository.guardarSi(compra, {
        estado: CONFIRMADA,
        recordatorioEnviado: { $ne: true },
      });
      if (!guardada) continue;
      enviados += 1;
      await this.#avisar("alRecordarEvento", guardada, evento);
    }
    return enviados;
  }

  /**
   * Recordatorio de pago a las reservas PENDIENTE a las que les quedan 24 h o menos, una sola
   * vez (flag recordatorioPagoEnviado guardado con condición, como recordarEventosProximos).
   */
  async recordarPagosPendientes() {
    const compras = await this.comprasRepository.listarParaRecordatorioPago(this.reloj.ahora());
    let enviados = 0;
    for (const compra of compras) {
      if (!compra.debeRecordarPago(this.reloj)) continue;
      compra.marcarRecordatorioPagoEnviado();
      const guardada = await this.comprasRepository.guardarSi(compra, {
        estado: PENDIENTE,
        recordatorioPagoEnviado: { $ne: true },
      });
      if (!guardada) continue;
      enviados += 1;
      await this.#avisar("alRecordarPago", guardada);
    }
    return enviados;
  }

  async reembolsosAutomaticos() {
    return this.#procesar(
      await this.comprasRepository.listarReembolsosVencidos(this.reloj.ahora()),
    );
  }

  /** Aplica las transiciones vencidas de cada compra. Un error en una no frena a las demás. */
  async #procesar(compras) {
    const eventos = await this.#eventosPorId(compras.map((c) => c.eventoId));
    let aplicadas = 0;
    for (const compra of compras) {
      // Se guarda antes: #actualizar aplica la transición sobre el mismo objeto.
      const estadoLeido = compra.estado;
      try {
        const actualizada = await this.#actualizar(compra, eventos.get(compra.eventoId));
        if (actualizada.estado !== estadoLeido) aplicadas += 1;
      } catch (error) {
        this.log.error?.(`No se pudo actualizar la compra ${compra.id}: ${error.message}`);
      }
    }
    return aplicadas;
  }

  // ----- Internos -----

  /** Transiciones automáticas que ya corresponden a la compra (vence, utiliza, reembolsa). */
  #transicionAutomatica(compra, evento) {
    const ahora = this.reloj.ahora().getTime();
    if (evento.estaCancelado() && compra.afectadaPorCancelacionDelEvento()) {
      return (c) =>
        c.aplicarCancelacionDelEvento(
          evento,
          evento.cancelacion.quien ?? ACTOR_SISTEMA,
          this.reloj,
        );
    }
    if (compra.estado === PENDIENTE && ahora >= compra.fechaLimitePago.getTime()) {
      return (c) => c.vencer(evento, this.reloj);
    }
    if (compra.estado === CONFIRMADA && evento.yaOcurrio(this.reloj)) {
      return (c) => c.marcarUtilizada(evento, this.reloj);
    }
    if (
      compra.estado === CANCELADA &&
      compra.reembolsoPendiente &&
      ahora >= compra.fechaLimiteReembolso.getTime()
    ) {
      return (c) => c.reembolsarAutomaticamente(this.reloj);
    }
    return null;
  }

  /** Evaluación perezosa: aplica las transiciones automáticas pendientes y devuelve la compra al día. */
  async #actualizar(compra, evento) {
    let actual = compra;
    // Se acota la cantidad de vueltas: si otro proceso compite, no se reintenta indefinidamente.
    for (let paso = 0; paso < 3; paso += 1) {
      const aplicar = this.#transicionAutomatica(actual, evento);
      if (!aplicar) return actual;
      try {
        actual = await this.#transicion(actual, evento, aplicar);
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error;
        // Otro proceso la cambió primero: se relee y se vuelve a evaluar.
        actual = await this.#obtenerCompra(actual.id);
      }
    }
    return actual;
  }

  /**
   * Aplica una transición del dominio y la persiste solo si la compra sigue en el estado leído.
   * Si dejó de estar activa (PENDIENTE/CONFIRMADA → CANCELADA, o → REEMBOLSADA en un solo paso
   * por la cancelación del evento), libera el cupo (una única vez).
   */
  async #transicion(compra, evento, aplicar) {
    const estadoAnterior = compra.estado;
    aplicar(compra);
    const guardada = await this.comprasRepository.guardarTransicion(compra, estadoAnterior);
    if (!guardada) {
      throw new ConflictError("La compra cambió mientras se procesaba. Volvé a intentarlo");
    }
    if (
      [PENDIENTE, CONFIRMADA].includes(estadoAnterior) &&
      [CANCELADA, REEMBOLSADA].includes(guardada.estado)
    ) {
      await this.eventosRepository.liberarCupo(
        evento.id,
        guardada.tipoEntradaId,
        guardada.cantidad,
      );
    }
    await this.#notificar(guardada);
    return guardada;
  }

  async #notificar(compra) {
    await this.#avisar("alCambiarEstado", compra, compra.historial.at(-1));
  }

  /** Llama a un hook (si está configurado). Un fallo al avisar nunca hace fallar la operación. */
  async #avisar(hook, ...args) {
    if (!this[hook]) return;
    try {
      await this[hook](...args);
    } catch (error) {
      this.log.error?.(`Falló el aviso ${hook} de la compra ${args[0]?.id}: ${error.message}`);
    }
  }

  /** Suma la puntuación al organizador con el dominio y guardado optimista (con reintentos). */
  async #sumarAlPuntaje(organizadorId, puntuacion) {
    for (let intento = 0; intento < REINTENTOS_PUNTAJE; intento += 1) {
      const organizador = await this.usuariosRepository.obtenerPorId(organizadorId, {
        incluirInactivos: true,
      });
      const cantidadLeida = organizador.cantidadResenias;
      organizador.registrarResenia(puntuacion);
      if (
        await this.usuariosRepository.guardarSi(organizador, { cantidadResenias: cantidadLeida })
      ) {
        return;
      }
    }
    throw new ConflictError("No se pudo registrar la reseña. Volvé a intentarlo");
  }

  async #propiaDelComprador(id, usuario) {
    const compra = await this.#obtenerCompra(id);
    if (!compra.esDe(usuario.id)) {
      throw new ForbiddenError("Solo el comprador puede operar sobre esta compra");
    }
    const evento = await this.#obtenerEvento(compra.eventoId);
    return { compra: await this.#actualizar(compra, evento), evento };
  }

  async #obtenerCompra(id) {
    const compra = await this.comprasRepository.obtenerPorId(id);
    if (!compra) throw new NotFoundError("No existe la compra indicada");
    return compra;
  }

  async #obtenerEvento(id) {
    const evento = await this.eventosRepository.obtenerPorId(id, { incluirInactivos: true });
    if (!evento) throw new NotFoundError("No existe el evento indicado");
    return evento;
  }

  async #eventosPorId(ids) {
    const eventos = await this.eventosRepository.obtenerVarios(ids);
    return new Map(eventos.map((e) => [e.id, e]));
  }
}
