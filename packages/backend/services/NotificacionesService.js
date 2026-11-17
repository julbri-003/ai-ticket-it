import { notificacionToDTO } from "../controllers/dto/notificacionDTO.js";
import { Notificacion } from "../domain/notificacionDominio.js";
import { ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { mismoId } from "../utils/id.js";
import { generarContenidoNotificacion } from "./TemplatesService.js";

/**
 * Notificaciones in-app: se generan con templates, se persisten y se empujan en tiempo real
 * (`notificacion:nueva` a la sala del destinatario) a través del emisor, sin conocer socket.io.
 */
export class NotificacionesService {
  constructor({ notificacionesRepository, emisor, reloj }) {
    this.notificacionesRepository = notificacionesRepository;
    this.emisor = emisor;
    this.reloj = reloj;
  }

  async notificar(tipo, destinatarioId, variables = {}, datos = {}) {
    const { titulo, mensaje } = generarContenidoNotificacion(tipo, variables);
    const notificacion = await this.notificacionesRepository.crear(
      new Notificacion({ destinatarioId, tipo, titulo, mensaje, datos, fecha: this.reloj.ahora() }),
    );
    this.emisor.emitirAUsuario(
      destinatarioId,
      "notificacion:nueva",
      notificacionToDTO(notificacion),
    );
    return notificacion;
  }

  async listar(usuario, { soloNoLeidas = false, pagina, limite } = {}) {
    return this.notificacionesRepository.listarPorDestinatario(usuario.id, {
      soloNoLeidas,
      pagina,
      limite,
    });
  }

  async contarNoLeidas(usuario) {
    return this.notificacionesRepository.contarNoLeidas(usuario.id);
  }

  /** Solo el destinatario puede marcarla (403 si no); inexistente → 404. */
  async marcarLeida(id, usuario) {
    const notificacion = await this.notificacionesRepository.obtenerPorId(id);
    if (!notificacion) {
      throw new NotFoundError("No existe la notificación indicada");
    }
    if (!mismoId(notificacion.destinatarioId, usuario.id)) {
      throw new ForbiddenError("Solo el destinatario puede marcar esta notificación");
    }
    return this.notificacionesRepository.marcarLeida(id);
  }

  async marcarTodasLeidas(usuario) {
    return this.notificacionesRepository.marcarTodasLeidas(usuario.id);
  }
}
