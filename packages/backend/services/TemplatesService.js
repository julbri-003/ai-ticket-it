import { NotFoundError } from "../errors/AppError.js";
import { notificationTemplates } from "../templates/notificacionTemplates.js";

/** Igual que REPO_REF: resuelve título y mensaje de un tipo de notificación con sus variables. */
export function generarContenidoNotificacion(tipo, variables = {}) {
  const template = notificationTemplates[tipo];
  if (!template) {
    throw new NotFoundError(`Template de notificación no encontrado: ${tipo}`);
  }
  return { titulo: template.titulo, mensaje: template.mensaje(variables) };
}
