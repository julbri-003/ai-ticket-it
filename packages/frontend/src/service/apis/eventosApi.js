import { apiCaller } from "./apiCaller";

export const eventosApi = {
  buscar: (params) => apiCaller.get("/eventos", params),
  recomendados: (params) => apiCaller.get("/eventos/recomendados", params),
  detalle: (id) => apiCaller.get(`/eventos/${id}`),
};

export default eventosApi;
