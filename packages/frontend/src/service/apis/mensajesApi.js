import { apiCaller } from "./apiCaller";

export const mensajesApi = {
  /** `desde` (ISO) trae solo los posteriores: se usa en el polling y al reconectar. */
  listar: (compraId, desde) =>
    apiCaller.get(`/compras/${compraId}/mensajes`, desde ? { desde } : {}),
  enviar: (compraId, mensaje) => apiCaller.post(`/compras/${compraId}/mensajes`, { mensaje }),
  marcarLeidos: (compraId) => apiCaller.post(`/compras/${compraId}/mensajes/leidos`),
  conversaciones: (params) => apiCaller.get("/compras/conversaciones", params),
};

export default mensajesApi;
