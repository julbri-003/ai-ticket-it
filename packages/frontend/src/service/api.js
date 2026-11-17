import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

export const TOKEN_KEY = "ati_auth_token";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      // SecureStore no está disponible en web: se sigue sin token.
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// El manejo del 401 (limpiar sesión y volver al login) se completa en la iteración 07,
// cuando existan AuthContext y la navegación.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),
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

export default api;
