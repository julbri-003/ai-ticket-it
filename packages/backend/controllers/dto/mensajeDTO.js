/** Mensaje del chat para la API y para el evento de socket `mensaje:nuevo`. */
export function mensajeToDTO({ id, usuarioId, usuarioNombre, rol, mensaje, enviado }) {
  return { id, usuarioId, usuarioNombre, rol, mensaje, enviado };
}
