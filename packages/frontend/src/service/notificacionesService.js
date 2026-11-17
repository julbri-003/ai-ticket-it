import { notificacionesApi } from "./apis/notificacionesApi";
import { diaHoraTexto } from "../utils/fechas";

/** DTO de notificación → modelo de UI (con la pantalla a la que lleva, si corresponde). */
export function aNotificacion(dto) {
  const datos = dto.datos ?? {};
  return {
    id: dto.id,
    tipo: dto.tipo,
    titulo: dto.titulo,
    mensaje: dto.mensaje,
    leida: Boolean(dto.leida),
    fechaTexto: dto.fecha ? diaHoraTexto(dto.fecha) : "",
    destino: datos.compraId
      ? {
          pantalla: dto.tipo === "NUEVO_MENSAJE" ? "ChatCompra" : "DetalleCompra",
          params: { compraId: datos.compraId },
        }
      : datos.eventoId
        ? { pantalla: "DetalleEvento", params: { eventoId: datos.eventoId } }
        : null,
    datos,
  };
}

export const notificacionesService = {
  async listar({ pagina = 1, limite = 15, soloNoLeidas = false } = {}) {
    const r = await notificacionesApi.listar({
      pagina,
      limite,
      ...(soloNoLeidas && { soloNoLeidas }),
    });
    return { ...r, items: r.items.map(aNotificacion) };
  },
  async cantidadNoLeidas() {
    const { cantidad } = await notificacionesApi.cantidadNoLeidas();
    return cantidad;
  },
  async marcarLeida(id) {
    return aNotificacion(await notificacionesApi.marcarLeida(id));
  },
  /** Limpia todas (baja lógica en el back). Devuelve cuántas se borraron. */
  async limpiar() {
    const { eliminadas } = await notificacionesApi.limpiar();
    return eliminadas;
  },
  async marcarTodas() {
    const { actualizadas } = await notificacionesApi.marcarTodas();
    return actualizadas;
  },
};

export default notificacionesService;
