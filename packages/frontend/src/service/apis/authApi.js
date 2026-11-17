import { apiCaller } from "./apiCaller";

export const authApi = {
  login: (email, password) => apiCaller.post("/auth/login", { email, password }),
  registro: (datos) => apiCaller.post("/auth/registro", datos),
  me: () => apiCaller.get("/auth/me"),
};

export default authApi;
