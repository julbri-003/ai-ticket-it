import { favoritosApi } from "./apis/favoritosApi";
import { aEvento } from "./eventosService";

export const favoritosService = {
  async listar() {
    return (await favoritosApi.listar()).map(aEvento);
  },
  /** Devuelve la lista de ids de favoritos. */
  async agregar(eventoId) {
    return (await favoritosApi.agregar(eventoId)).favoritos;
  },
  async quitar(eventoId) {
    return (await favoritosApi.quitar(eventoId)).favoritos;
  },
};

export default favoritosService;
