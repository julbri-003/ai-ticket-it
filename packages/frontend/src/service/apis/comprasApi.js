import { apiCaller } from "./apiCaller";

export const comprasApi = {
  crear: (datos) => apiCaller.post("/compras", datos),
  mias: (params) => apiCaller.get("/compras/mias", params),
  detalle: (id) => apiCaller.get(`/compras/${id}`),
  pagar: (id) => apiCaller.post(`/compras/${id}/pagar`),
  cancelar: (id) => apiCaller.post(`/compras/${id}/cancelar`),
  reembolsar: (id) => apiCaller.post(`/compras/${id}/reembolsar`),
  reseniar: (id, datos) => apiCaller.post(`/compras/${id}/resenia`, datos),
};

export default comprasApi;
