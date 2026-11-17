import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotificaciones } from "../context/NotificacionesContext";
import { useSocket } from "../context/SocketContext";
import { aMensaje, mensajesService, unirMensajes } from "../service/mensajesService";
import { horaTexto } from "../utils/fechas";

export const INTERVALO_POLLING_MS = 10000;

/** El `enviado` del último mensaje confirmado (para pedir solo los nuevos con ?desde=). */
function ultimoConfirmado(mensajes) {
  const confirmados = mensajes.filter((m) => m.estado === "enviado");
  return confirmados.length ? confirmados[confirmados.length - 1].enviado : null;
}

/**
 * Chat de una compra:
 * 1. Carga el historial por REST.
 * 2. Con socket: `compra:unirse` y `mensaje:nuevo` (sin repetir por id). Al (re)conectar pide los
 *    mensajes posteriores al último, por si llegó alguno mientras estaba caído.
 * 3. Sin socket: polling cada 10 s con `?desde=`.
 * 4. Enviar por REST con un mensaje optimista "enviando…" que se reemplaza por el real o queda con
 *    error para reintentar.
 * 5. Marca leídos al cargar y al recibir mensajes del otro. Al desmontar, `compra:salir`.
 */
export function useChatCompra(compraId) {
  const { usuario } = useAuth();
  const { socket, conectado } = useSocket();
  const { setChatAbierto, refrescar: refrescarContadores } = useNotificaciones();
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const mensajesRef = useRef(mensajes);
  mensajesRef.current = mensajes;
  const usuarioId = usuario?.id;

  // El back marca leídos los mensajes y, además, los avisos NUEVO_MENSAJE de esta compra:
  // si cambió alguno se recalcula la campana. El contador de Mensajes se recalcula al salir.
  const marcarLeidos = useCallback(() => {
    mensajesService
      .marcarLeidos(compraId)
      .then((r) => {
        if (r?.notificacionesLeidas > 0) refrescarContadores();
      })
      .catch(() => {});
  }, [compraId, refrescarContadores]);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const { mensajes: historial } = await mensajesService.listar(compraId, usuarioId);
      setMensajes((actuales) =>
        unirMensajes(
          actuales.filter((m) => m.estado !== "enviado"),
          historial,
        ),
      );
      marcarLeidos();
    } catch (e) {
      setError(e);
    } finally {
      setCargando(false);
    }
  }, [compraId, usuarioId, marcarLeidos]);

  /** Mensajes posteriores al último confirmado (polling y recuperación al reconectar). */
  const traerNuevos = useCallback(async () => {
    const desde = ultimoConfirmado(mensajesRef.current);
    if (!desde) return cargar();
    try {
      const { mensajes: nuevos } = await mensajesService.listar(compraId, usuarioId, desde);
      if (nuevos.length) {
        setMensajes((actuales) => unirMensajes(actuales, nuevos));
        if (nuevos.some((m) => !m.propio)) marcarLeidos();
      }
    } catch {
      // Sin conexión: se reintenta en la próxima vuelta.
    }
    return undefined;
  }, [compraId, usuarioId, cargar, marcarLeidos]);

  // Carga inicial y aviso de "chat abierto" (para no mostrar el toast de sus mensajes).
  useEffect(() => {
    cargar();
    setChatAbierto(compraId);
    return () => setChatAbierto(null);
  }, [compraId, cargar, setChatAbierto]);

  // Tiempo real: sala de la compra y mensajes nuevos.
  useEffect(() => {
    if (!socket || !conectado) return undefined;
    const alNuevo = ({ compraId: id, mensaje }) => {
      if (String(id) !== String(compraId)) return;
      const nuevo = aMensaje(mensaje, usuarioId);
      const repetido = mensajesRef.current.some((m) => m.id === nuevo.id);
      // Se actualiza la ref en el acto: dos eventos seguidos llegan antes del próximo render.
      mensajesRef.current = unirMensajes(mensajesRef.current, [nuevo]);
      setMensajes((actuales) => unirMensajes(actuales, [nuevo]));
      if (!nuevo.propio && !repetido) marcarLeidos();
    };
    socket.on("mensaje:nuevo", alNuevo);
    socket.emit("compra:unirse", { compraId });
    if (ultimoConfirmado(mensajesRef.current)) traerNuevos();
    return () => {
      socket.off("mensaje:nuevo", alNuevo);
      socket.emit("compra:salir", { compraId });
    };
  }, [socket, conectado, compraId, usuarioId, marcarLeidos, traerNuevos]);

  // Fallback: sin socket, polling cada 10 s.
  useEffect(() => {
    if (conectado) return undefined;
    const id = setInterval(traerNuevos, INTERVALO_POLLING_MS);
    return () => clearInterval(id);
  }, [conectado, traerNuevos]);

  const enviar = useCallback(
    async (texto) => {
      const limpio = texto.trim();
      if (!limpio) return;
      const ahora = new Date().toISOString();
      const temporal = {
        id: `temporal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        texto: limpio,
        autor: usuario?.nombre ?? "Vos",
        propio: true,
        enviado: ahora,
        horaTexto: horaTexto(ahora),
        estado: "enviando",
      };
      setMensajes((actuales) => [...actuales, temporal]);
      try {
        const real = await mensajesService.enviar(compraId, limpio, usuarioId);
        setMensajes((actuales) =>
          unirMensajes(
            actuales.filter((m) => m.id !== temporal.id),
            [real],
          ),
        );
      } catch (e) {
        setMensajes((actuales) =>
          actuales.map((m) =>
            m.id === temporal.id ? { ...m, estado: "error", errorTexto: e.message } : m,
          ),
        );
      }
    },
    [compraId, usuarioId, usuario?.nombre],
  );

  const reintentar = useCallback(
    (id) => {
      const fallido = mensajesRef.current.find((m) => m.id === id);
      if (!fallido) return;
      setMensajes((actuales) => actuales.filter((m) => m.id !== id));
      enviar(fallido.texto);
    },
    [enviar],
  );

  return { mensajes, cargando, error, conectado, enviar, reintentar, recargar: cargar };
}

export default useChatCompra;
