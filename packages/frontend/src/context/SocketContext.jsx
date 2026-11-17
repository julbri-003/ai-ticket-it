import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { crearSocket } from "../service/socket";

export const SocketContext = createContext({ socket: null, conectado: false });

/**
 * Socket autenticado mientras hay sesión: conecta con el token, desconecta al cerrar sesión y
 * reconecta cuando la app vuelve a primer plano. Expone `socket` y `conectado`.
 * `crear` se puede reemplazar en los tests.
 */
export function SocketProvider({ children, crear = crearSocket }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [conectado, setConectado] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    const nuevo = crear(token);
    const alConectar = () => setConectado(true);
    const alCortar = () => setConectado(false);
    nuevo.on("connect", alConectar);
    nuevo.on("disconnect", alCortar);
    nuevo.on("connect_error", alCortar);
    nuevo.connect();
    setSocket(nuevo);

    const suscripcion = AppState.addEventListener("change", (estado) => {
      if (estado === "active" && !nuevo.connected) nuevo.connect();
    });

    return () => {
      suscripcion.remove();
      nuevo.off("connect", alConectar);
      nuevo.off("disconnect", alCortar);
      nuevo.off("connect_error", alCortar);
      nuevo.disconnect();
      setSocket(null);
      setConectado(false);
    };
  }, [token, crear]);

  const valor = useMemo(() => ({ socket, conectado }), [socket, conectado]);
  return <SocketContext.Provider value={valor}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

/** Suscribe `manejador` al evento del socket mientras el componente está montado. */
export function useEventoSocket(evento, manejador) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket || !manejador) return undefined;
    socket.on(evento, manejador);
    return () => socket.off(evento, manejador);
  }, [socket, evento, manejador]);
}

export default SocketContext;
