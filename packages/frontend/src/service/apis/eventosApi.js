import { apiCaller } from "./apiCaller";

export const eventosApi = {
  buscar: (params) => apiCaller.get("/eventos", params),
  recomendados: (params) => apiCaller.get("/eventos/recomendados", params),
  detalle: (id) => apiCaller.get(`/eventos/${id}`),

  // ----- Organizador -----
  mios: () => apiCaller.get("/eventos/mios"),
  crear: (datos) => apiCaller.post("/eventos", datos),
  /** multipart: campo "archivos" + "alts" en el mismo orden. `alProgreso(0..1)` opcional. */
  subirMultimedia: (id, formData, alProgreso) =>
    apiCaller.postForm(`/eventos/${id}/multimedia`, formData, {
      timeout: 120000,
      onUploadProgress: (e) => e.total && alProgreso?.(e.loaded / e.total),
    }),
  quitarMultimedia: (id, ruta) => apiCaller.delete(`/eventos/${id}/multimedia`, { data: { ruta } }),
  agregarTipoEntrada: (id, tipo) => apiCaller.post(`/eventos/${id}/tipos-entrada`, tipo),
  cancelar: (id, motivo) => apiCaller.post(`/eventos/${id}/cancelar`, { motivo }),
  ampliar: (id, texto) => apiCaller.post(`/eventos/${id}/ampliaciones`, { texto }),
  comprasDelEvento: (id, params) => apiCaller.get(`/eventos/${id}/compras`, params),
};

export default eventosApi;
