import { apiCaller } from "./apiCaller";

export const reseniasApi = {
  /** Reseñas de todos los eventos del organizador del evento (caso de uso 10). */
  delOrganizadorDelEvento: (eventoId, params) =>
    apiCaller.get(`/eventos/${eventoId}/resenias`, params),
};

export default reseniasApi;
