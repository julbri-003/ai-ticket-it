import { io } from "socket.io-client";
import { SERVER_URL } from "./api";

/**
 * Cliente socket.io autenticado con el JWT (handshake `auth.token`). Se conecta al mismo host y
 * puerto que la API. Queda listo para el chat y las notificaciones en tiempo real (iteración 10).
 */
export function crearSocket(token) {
  return io(SERVER_URL, {
    auth: { token },
    transports: ["websocket"],
    autoConnect: false,
    reconnection: true,
  });
}
