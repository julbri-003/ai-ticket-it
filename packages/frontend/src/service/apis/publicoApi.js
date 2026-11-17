import { apiCaller } from "./apiCaller";

export const publicoApi = {
  resumen: () => apiCaller.get("/resumen-publico"),
  categorias: () => apiCaller.get("/categorias"),
  proximosEventos: (limite = 8) => apiCaller.get("/eventos", { orden: "fecha", limite }),
};

export default publicoApi;
