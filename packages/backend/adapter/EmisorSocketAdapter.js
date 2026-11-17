/**
 * Emisión de eventos en tiempo real. Es la única pieza que conoce socket.io: los services
 * dependen de esta interfaz (emitirACompra, emitirAUsuario, usuarioEnCompra).
 * Hasta que se conecta un servidor (`conectar(io)`) no emite nada: así funcionan los tests REST
 * y cualquier proceso sin sockets (scripts, seeds).
 */
export const salaUsuario = (usuarioId) => `usuario:${usuarioId}`;
export const salaCompra = (compraId) => `compra:${compraId}`;

export class EmisorSocketAdapter {
  constructor() {
    this.io = null;
  }

  conectar(io) {
    this.io = io;
  }

  emitirACompra(compraId, evento, payload) {
    this.io?.to(salaCompra(compraId)).emit(evento, payload);
  }

  emitirAUsuario(usuarioId, evento, payload) {
    this.io?.to(salaUsuario(usuarioId)).emit(evento, payload);
  }

  /** true si el usuario tiene algún socket dentro de la sala de la compra (está mirando el chat). */
  async usuarioEnCompra(usuarioId, compraId) {
    if (!this.io) return false;
    const sockets = await this.io.in(salaCompra(compraId)).fetchSockets();
    return sockets.some((s) => String(s.data.usuario?.id) === String(usuarioId));
  }
}
