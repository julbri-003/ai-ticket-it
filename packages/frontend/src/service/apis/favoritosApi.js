import { apiCaller } from "./apiCaller";

export const favoritosApi = {
  listar: () => apiCaller.get("/favoritos"),
  agregar: (eventoId) => apiCaller.put(`/favoritos/${eventoId}`),
  quitar: (eventoId) => apiCaller.delete(`/favoritos/${eventoId}`),
};

export default favoritosApi;
