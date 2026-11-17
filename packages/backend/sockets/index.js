import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { salaCompra, salaUsuario } from "../adapter/EmisorSocketAdapter.js";
import { emisorSocket, mensajesService } from "../dependencias.js";
import { origenesPermitidos } from "../utils/cors.js";

/**
 * Monta socket.io sobre el mismo http.Server que express.
 * - Auth en el handshake: `auth.token` (JWT) → si es inválido, se rechaza la conexión.
 * - Cada socket entra a la sala `usuario:<id>` (compra:estado, notificacion:nueva).
 * - `compra:unirse` / `compra:salir` con ack, para recibir `mensaje:nuevo` de esa compra.
 * Los mensajes se envían por REST: el socket solo empuja.
 */
export function inicializarSockets(
  httpServer,
  { emisor = emisorSocket, mensajes = mensajesService } = {},
) {
  const io = new Server(httpServer, { cors: { origin: origenesPermitidos() } });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      socket.data.usuario = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("No autorizado"));
    }
  });

  io.on("connection", (socket) => {
    const { usuario } = socket.data;
    socket.join(salaUsuario(usuario.id));

    socket.on("compra:unirse", async ({ compraId } = {}, ack) => {
      const responder = typeof ack === "function" ? ack : () => {};
      try {
        const compra = await mensajes.verificarParticipante(compraId, usuario);
        await socket.join(salaCompra(compra.id));
        responder({ ok: true });
      } catch (error) {
        responder({ error: error.message });
      }
    });

    socket.on("compra:salir", async ({ compraId } = {}, ack) => {
      await socket.leave(salaCompra(compraId));
      if (typeof ack === "function") ack({ ok: true });
    });
  });

  emisor.conectar(io);
  return io;
}
