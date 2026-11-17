import * as SecureStore from "expo-secure-store";
import { authApi } from "./apis/authApi";

const TOKEN_KEY = "ati_auth_token";

// SecureStore no existe en web: ahí la sesión vive solo en memoria.
async function seguro(operacion, porDefecto = null) {
  try {
    return await operacion();
  } catch {
    return porDefecto;
  }
}

/** DTO del back → modelo de UI. */
export function aUsuario(dto) {
  if (!dto) return null;
  return {
    id: dto.id,
    nombre: dto.nombre,
    apellido: dto.apellido,
    nombreCompleto: `${dto.nombre} ${dto.apellido}`,
    email: dto.email,
    rol: dto.rol,
    puntajePromedio: dto.puntajePromedio ?? null,
    cantidadResenias: dto.cantidadResenias ?? null,
  };
}

export const authService = {
  leerToken: () => seguro(() => SecureStore.getItemAsync(TOKEN_KEY)),
  guardarToken: (token) => seguro(() => SecureStore.setItemAsync(TOKEN_KEY, token)),
  borrarToken: () => seguro(() => SecureStore.deleteItemAsync(TOKEN_KEY)),

  async iniciarSesion(email, password) {
    const { token, usuario } = await authApi.login(email.trim(), password);
    return { token, usuario: aUsuario(usuario) };
  },

  async registrarse({ nombre, apellido, email, password, rol }) {
    const { token, usuario } = await authApi.registro({
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      email: email.trim(),
      password,
      rol,
    });
    return { token, usuario: aUsuario(usuario) };
  },

  async obtenerActual() {
    return aUsuario(await authApi.me());
  },
};

export default authService;
