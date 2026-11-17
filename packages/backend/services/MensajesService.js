import { mensajeToDTO } from "../controllers/dto/mensajeDTO.js";
import { ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { TiposNotificacion } from "../templates/notificacionTemplates.js";
import { mismoId } from "../utils/id.js";

const LARGO_EXTRACTO = 80;

/**
 * Chat de una compra entre el comprador y el organizador. El envío es por REST (pasa por zod,
 * auth, service y dominio); el socket solo empuja `mensaje:nuevo` a la sala de la compra.
 */
export class MensajesService {
  constructor({
    comprasRepository,
    eventosRepository,
    notificacionesService,
    emisor,
    reloj,
    log = console,
  }) {
    this.comprasRepository = comprasRepository;
    this.eventosRepository = eventosRepository;
    this.notificacionesService = notificacionesService;
    this.emisor = emisor;
    this.reloj = reloj;
    this.log = log;
  }

  /** Devuelve la compra si el usuario es participante. 404 si no existe, 403 si no participa. */
  async verificarParticipante(compraId, usuario) {
    const compra = await this.comprasRepository.obtenerPorId(compraId);
    if (!compra) {
      throw new NotFoundError("No existe la compra indicada");
    }
    if (!compra.esParticipante(usuario?.id)) {
      throw new ForbiddenError("Solo el comprador y el organizador pueden usar este chat");
    }
    return compra;
  }

  /** Mensajes en orden de envío; con `desde`, solo los posteriores (para el polling). */
  async listar(compraId, usuario, { desde } = {}) {
    const compra = await this.verificarParticipante(compraId, usuario);
    const limite = desde ? desde.getTime() : -Infinity;
    return {
      compra,
      mensajes: compra.mensajes
        .filter((m) => m.enviado.getTime() > limite)
        .sort((a, b) => a.enviado - b.enviado),
    };
  }

  /** Permitido en cualquier estado de la compra. Quien escribe queda con el chat leído. */
  async enviar(compraId, usuario, texto) {
    const compra = await this.verificarParticipante(compraId, usuario);
    const mensaje = compra.agregarMensaje(
      { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
      texto,
      this.reloj,
    );
    const guardado = await this.comprasRepository.agregarMensaje(compra.id, mensaje);
    const { campo, fecha } = compra.registrarLectura(usuario.id, this.reloj);
    await this.comprasRepository.registrarLectura(compra.id, campo, fecha);

    this.emisor.emitirACompra(compra.id, "mensaje:nuevo", {
      compraId: compra.id,
      mensaje: mensajeToDTO(guardado),
    });
    await this.#avisarAlOtro(compra, usuario, guardado);
    return guardado;
  }

  /** Marca como leídos los mensajes del otro participante (hasta ahora). */
  async marcarLeidos(compraId, usuario) {
    const compra = await this.verificarParticipante(compraId, usuario);
    const { campo, fecha } = compra.registrarLectura(usuario.id, this.reloj);
    await this.comprasRepository.registrarLectura(compra.id, campo, fecha);
    return { ultimaLectura: fecha, mensajesNoLeidos: compra.mensajesNoLeidosPara(usuario.id) };
  }

  /** NUEVO_MENSAJE al otro participante, salvo que ya esté mirando el chat (en la sala). */
  async #avisarAlOtro(compra, autor, mensaje) {
    const otroId = mismoId(compra.compradorId, autor.id)
      ? compra.organizadorId
      : compra.compradorId;
    try {
      if (await this.emisor.usuarioEnCompra(otroId, compra.id)) return;
      const evento = await this.eventosRepository.obtenerPorId(compra.eventoId, {
        incluirInactivos: true,
      });
      const extracto =
        mensaje.mensaje.length > LARGO_EXTRACTO
          ? `${mensaje.mensaje.slice(0, LARGO_EXTRACTO - 1)}…`
          : mensaje.mensaje;
      await this.notificacionesService.notificar(
        TiposNotificacion.NUEVO_MENSAJE,
        otroId,
        { autor: autor.nombre, evento: evento?.nombre ?? "tu compra", extracto },
        { compraId: compra.id, eventoId: compra.eventoId },
      );
    } catch (error) {
      // El mensaje ya se guardó: un fallo al notificar no debe hacer fallar el envío.
      this.log.error?.(
        `No se pudo notificar el mensaje de la compra ${compra.id}: ${error.message}`,
      );
    }
  }
}
