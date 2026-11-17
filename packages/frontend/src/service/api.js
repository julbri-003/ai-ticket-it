import axios from "axios";
import Constants from "expo-constants";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:8000/api";

/** Base del servidor sin "/api" (para socket.io y archivos). */
export const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

// La sesión la maneja AuthContext: registra de dónde sale el token (getter en memoria, no se
// lee el storage en cada request) y qué hacer ante un 401.
let obtenerToken = () => null;
let alNoAutorizado = null;

export function configurarSesion({ obtenerToken: getter, alNoAutorizado: callback }) {
  obtenerToken = getter ?? (() => null);
  alNoAutorizado = callback ?? null;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 con sesión: el token venció o es inválido → AuthContext cierra la sesión y la navegación
// vuelve sola al AuthStack. En login/registro no se dispara (ahí el 401 es "Credenciales inválidas").
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const esAuth = /\/auth\/(login|registro)$/.test(error?.config?.url ?? "");
    const teniaToken = Boolean(error?.config?.headers?.Authorization);
    if (error?.response?.status === 401 && teniaToken && !esAuth) {
      alNoAutorizado?.();
    }
    return Promise.reject(error);
  },
);

export const mensajeDeError = (error) => {
  const data = error?.response?.data;

  if (data) {
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
    if (Array.isArray(data.detalles) && data.detalles.length > 0) {
      return data.detalles
        .map((d) => d.mensaje || d.message)
        .filter(Boolean)
        .join(". ");
    }
    if (typeof data.error === "string" && data.error.trim()) {
      return data.error;
    }
  }

  if (error?.response?.status >= 500) {
    return "Ocurrió un error en el servidor. Intentá nuevamente en unos minutos";
  }
  if (!error?.response) {
    return "No pudimos conectarnos con el servidor";
  }
  if (typeof error?.message === "string" && error.message.trim()) {
    return error.message;
  }
  return "No pudimos conectarnos con el servidor";
};

/** true si el error es de red (sin respuesta del servidor). */
export const esErrorDeConexion = (error) => Boolean(error) && !error.response && !error.status;

export default api;
