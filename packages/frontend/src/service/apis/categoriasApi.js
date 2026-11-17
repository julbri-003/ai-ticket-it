import { apiCaller } from "./apiCaller";

export const categoriasApi = {
  listar: () => apiCaller.get("/categorias"),
};

export default categoriasApi;
