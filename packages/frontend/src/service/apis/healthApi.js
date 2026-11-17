import { apiCaller } from "./apiCaller";

export const healthApi = {
  obtener: () => apiCaller.get("/health"),
};

export default healthApi;
