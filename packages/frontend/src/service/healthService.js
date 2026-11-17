import { healthApi } from "./apis/healthApi";

// Devuelve el estado del back como texto ("ok" si responde bien).
export async function obtenerEstadoBackend() {
  const respuesta = await healthApi.obtener();
  return respuesta?.status ?? "desconocido";
}
