import { notificacionesApi } from "./apis/notificacionesApi";

export const notificacionesService = {
  async cantidadNoLeidas() {
    const { cantidad } = await notificacionesApi.cantidadNoLeidas();
    return cantidad;
  },
};

export default notificacionesService;
