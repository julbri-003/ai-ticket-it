/** Notificación para la API y para el evento de socket `notificacion:nueva`. */
export function notificacionToDTO(notificacion) {
  return {
    id: notificacion.id,
    tipo: notificacion.tipo,
    titulo: notificacion.titulo,
    mensaje: notificacion.mensaje,
    datos: { ...notificacion.datos },
    fecha: notificacion.fecha,
    leida: notificacion.leida,
  };
}
