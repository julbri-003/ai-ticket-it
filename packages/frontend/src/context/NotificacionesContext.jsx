import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useEventoSocket, useSocket } from "./SocketContext";
import { useToast } from "./ToastContext";
import { mensajesService } from "../service/mensajesService";
import { notificacionesService } from "../service/notificacionesService";

export const NotificacionesContext = createContext({
  noLeidas: 0,
  mensajesNoLeidos: 0,
  refrescar: () => {},
  marcarLeida: async () => {},
  marcarTodas: async () => {},
  setChatAbierto: () => {},
  ultima: null,
});

/**
 * Contadores del top app bar: notificaciones no leídas (carga por REST y +1 con
 * `notificacion:nueva`, con un toast) y mensajes de chat no leídos (GET /compras/conversaciones).
 * El chat abierto avisa su compra para no mostrar el toast de sus propios mensajes.
 */
export function NotificacionesProvider({ children }) {
  const { usuario } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [noLeidas, setNoLeidas] = useState(0);
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0);
  const [ultima, setUltima] = useState(null);
  const chatAbierto = useRef(null);

  const refrescarMensajes = useCallback(() => {
    mensajesService
      .totalNoLeidos()
      .then(setMensajesNoLeidos)
      .catch(() => {});
  }, []);

  const refrescar = useCallback(() => {
    if (!usuario) return;
    notificacionesService
      .cantidadNoLeidas()
      .then(setNoLeidas)
      .catch(() => {});
    refrescarMensajes();
  }, [usuario, refrescarMensajes]);

  useEffect(() => {
    if (usuario) refrescar();
    else {
      setNoLeidas(0);
      setMensajesNoLeidos(0);
    }
  }, [usuario, refrescar]);

  // Al (re)conectar se recalcula: pudo haber llegado algo mientras el socket estaba caído.
  useEffect(() => {
    if (!socket) return undefined;
    socket.on("connect", refrescar);
    return () => socket.off("connect", refrescar);
  }, [socket, refrescar]);

  const alNueva = useCallback(
    (notificacion) => {
      setNoLeidas((c) => c + 1);
      setUltima(notificacion);
      if (notificacion.tipo === "NUEVO_MENSAJE") {
        refrescarMensajes();
        if (chatAbierto.current && chatAbierto.current === notificacion.datos?.compraId) return;
      }
      toast.mostrar({ tipo: "info", titulo: notificacion.titulo, mensaje: notificacion.mensaje });
    },
    [toast, refrescarMensajes],
  );
  useEventoSocket("notificacion:nueva", alNueva);

  const marcarLeida = useCallback(async (id) => {
    await notificacionesService.marcarLeida(id);
    setNoLeidas((c) => Math.max(0, c - 1));
  }, []);

  const marcarTodas = useCallback(async () => {
    await notificacionesService.marcarTodas();
    setNoLeidas(0);
  }, []);

  const setChatAbierto = useCallback(
    (compraId) => {
      chatAbierto.current = compraId;
      if (!compraId) refrescarMensajes();
    },
    [refrescarMensajes],
  );

  const valor = useMemo(
    () => ({
      noLeidas,
      mensajesNoLeidos,
      refrescar,
      refrescarMensajes,
      marcarLeida,
      marcarTodas,
      setChatAbierto,
      ultima,
    }),
    [
      noLeidas,
      mensajesNoLeidos,
      refrescar,
      refrescarMensajes,
      marcarLeida,
      marcarTodas,
      setChatAbierto,
      ultima,
    ],
  );
  return <NotificacionesContext.Provider value={valor}>{children}</NotificacionesContext.Provider>;
}

export const useNotificaciones = () => useContext(NotificacionesContext);

export default NotificacionesContext;
