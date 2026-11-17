import { ACTOR_SISTEMA, EstadoCompra, MotivoCancelacion } from "../domain/estadoCompraDominio.js";
import { TiposNotificacion as T } from "../templates/notificacionTemplates.js";
import { formatearFechaHora } from "../utils/fechas.js";
import { formatearMonto } from "../utils/montos.js";

/**
 * Se conecta a los hooks de ComprasService: en cada transición emite `compra:estado` a los dos
 * participantes y crea las notificaciones que correspondan según la tabla de la spec 06.
 */
export class AvisosComprasService {
  constructor({ notificacionesService, eventosRepository, emisor }) {
    this.notificacionesService = notificacionesService;
    this.eventosRepository = eventosRepository;
    this.emisor = emisor;
  }

  /** Devuelve la notificación creada (o la lista, si son varias; null si no corresponde ninguna). */
  async alCambiarEstado(compra, cambio) {
    const payload = {
      compraId: compra.id,
      estado: compra.estado,
      cambio: {
        estadoAnterior: cambio.estadoAnterior,
        estadoNuevo: cambio.estadoNuevo,
        quien: cambio.quien,
        fechaHora: cambio.fechaHora,
        detalle: cambio.detalle,
      },
    };
    this.emisor.emitirAUsuario(compra.compradorId, "compra:estado", payload);
    this.emisor.emitirAUsuario(compra.organizadorId, "compra:estado", payload);

    const vars = await this.#variables(compra);
    const avisar = (tipo, destinatarioId, extra = {}) =>
      this.notificacionesService.notificar(tipo, destinatarioId, { ...vars, ...extra }, vars.datos);

    switch (cambio.estadoNuevo) {
      case EstadoCompra.PENDIENTE:
        return avisar(T.NUEVA_COMPRA, compra.organizadorId);
      case EstadoCompra.CONFIRMADA:
        return [
          await avisar(T.COMPRA_CONFIRMADA, compra.compradorId, { paraOrganizador: false }),
          await avisar(T.COMPRA_CONFIRMADA, compra.organizadorId, { paraOrganizador: true }),
        ];
      case EstadoCompra.CANCELADA:
        if (compra.motivoCancelacion === MotivoCancelacion.VENCIDA) {
          return avisar(T.COMPRA_VENCIDA, compra.compradorId);
        }
        return avisar(T.COMPRA_CANCELADA, compra.organizadorId, {
          debeReembolsar: compra.reembolsoPendiente,
          fechaLimiteReembolso: compra.fechaLimiteReembolso
            ? formatearFechaHora(compra.fechaLimiteReembolso)
            : null,
        });
      case EstadoCompra.REEMBOLSADA:
        return avisar(T.REEMBOLSO_REALIZADO, compra.compradorId, {
          automatico: cambio.quien.id === ACTOR_SISTEMA.id,
        });
      case EstadoCompra.UTILIZADA:
        return avisar(T.ENTRADA_UTILIZADA, compra.compradorId);
      default:
        return null;
    }
  }

  async alReseniar(compra, resenia) {
    const vars = await this.#variables(compra);
    return this.notificacionesService.notificar(
      T.NUEVA_RESENIA,
      compra.organizadorId,
      { ...vars, comprador: resenia.compradorNombre, puntuacion: resenia.puntuacion },
      vars.datos,
    );
  }

  async alRecordarEvento(compra, evento) {
    return this.notificacionesService.notificar(
      T.RECORDATORIO_EVENTO,
      compra.compradorId,
      { evento: evento.nombre, fecha: formatearFechaHora(evento.fecha), lugar: evento.lugar },
      { compraId: compra.id, eventoId: evento.id },
    );
  }

  /** Variables comunes. El nombre del comprador sale del historial (quien creó la compra). */
  async #variables(compra) {
    const evento = await this.eventosRepository.obtenerPorId(compra.eventoId, {
      incluirInactivos: true,
    });
    return {
      evento: evento?.nombre ?? "el evento",
      comprador: compra.historial[0]?.quien.nombre ?? "Un comprador",
      cantidad: compra.cantidad,
      tipoEntrada: compra.tipoEntradaNombre,
      total: formatearMonto(compra.total),
      datos: { compraId: compra.id, eventoId: compra.eventoId },
    };
  }
}
