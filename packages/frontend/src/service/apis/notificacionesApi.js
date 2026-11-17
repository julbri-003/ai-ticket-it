import { apiCaller } from "./apiCaller";

export const notificacionesApi = {
  listar: (params) => apiCaller.get("/notificaciones", params),
  cantidadNoLeidas: () => apiCaller.get("/notificaciones/no-leidas/cantidad"),
  marcarLeida: (id) => apiCaller.patch(`/notificaciones/${id}/leida`),
  marcarTodas: () => apiCaller.patch("/notificaciones/leidas"),
  /** Baja lógica de todas las del usuario. */
  limpiar: () => apiCaller.delete("/notificaciones"),
};

export default notificacionesApi;
