import { apiCaller } from "./apiCaller";

export const notificacionesApi = {
  cantidadNoLeidas: () => apiCaller.get("/notificaciones/no-leidas/cantidad"),
};

export default notificacionesApi;
