import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { configurarSesion } from "../service/api";
import { authService } from "../service/authService";
import { useToast } from "./ToastContext";

const AuthContext = createContext(undefined);

const ROLES = { COMPRADOR: "COMPRADOR", ORGANIZADOR: "ORGANIZADOR" };

/**
 * Sesión: usuario, token y cargando. Al abrir la app restaura la sesión guardada validándola con
 * /auth/me. Ante un 401 con sesión (token vencido o inválido) cierra la sesión con un aviso;
 * la navegación vuelve sola al AuthStack porque depende de `usuario`.
 */
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);
  const tokenRef = useRef(null);
  const toast = useToast();

  const aplicarSesion = useCallback(async (nuevoToken, nuevoUsuario) => {
    tokenRef.current = nuevoToken;
    setToken(nuevoToken);
    setUsuario(nuevoUsuario);
    if (nuevoToken) await authService.guardarToken(nuevoToken);
  }, []);

  const cerrarSesion = useCallback(
    async ({ vencida = false } = {}) => {
      const habiaSesion = Boolean(tokenRef.current);
      tokenRef.current = null;
      setToken(null);
      setUsuario(null);
      await authService.borrarToken();
      if (vencida && habiaSesion) {
        toast.warning("Tu sesión venció o ya no es válida. Volvé a ingresar.", "Sesión cerrada");
      }
    },
    [toast],
  );

  // El cliente HTTP toma el token de memoria y avisa los 401.
  useEffect(() => {
    configurarSesion({
      obtenerToken: () => tokenRef.current,
      alNoAutorizado: () => cerrarSesion({ vencida: true }),
    });
  }, [cerrarSesion]);

  // Restaurar la sesión guardada.
  useEffect(() => {
    let vigente = true;
    (async () => {
      const guardado = await authService.leerToken();
      if (!guardado) {
        if (vigente) setCargando(false);
        return;
      }
      tokenRef.current = guardado;
      try {
        const actual = await authService.obtenerActual();
        if (vigente) {
          setToken(guardado);
          setUsuario(actual);
        }
      } catch (error) {
        // 401 → el interceptor ya cerró la sesión. Sin conexión: se conserva el token para
        // reintentar al volver a abrir, pero se muestra el login.
        if (error?.status !== 401) tokenRef.current = null;
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const iniciarSesion = useCallback(
    async (email, password) => {
      const { token: nuevo, usuario: datos } = await authService.iniciarSesion(email, password);
      await aplicarSesion(nuevo, datos);
      toast.success(`¡Hola, ${datos.nombre}!`, "Sesión iniciada");
      return datos;
    },
    [aplicarSesion, toast],
  );

  const registrarse = useCallback(
    async (datos) => {
      const { token: nuevo, usuario: creado } = await authService.registrarse(datos);
      await aplicarSesion(nuevo, creado);
      toast.success(`Tu cuenta está lista, ${creado.nombre}.`, "¡Bienvenida/o!");
      return creado;
    },
    [aplicarSesion, toast],
  );

  const valor = useMemo(
    () => ({
      usuario,
      token,
      cargando,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      esComprador: usuario?.rol === ROLES.COMPRADOR,
      esOrganizador: usuario?.rol === ROLES.ORGANIZADOR,
    }),
    [usuario, token, cargando, iniciarSesion, registrarse, cerrarSesion],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return contexto;
};

export { AuthContext };
