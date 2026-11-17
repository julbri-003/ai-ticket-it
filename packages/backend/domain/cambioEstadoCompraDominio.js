import { BadRequestError } from "../errors/AppError.js";
import { ACTOR_SISTEMA, EstadoCompra, ROL_SISTEMA } from "./estadoCompraDominio.js";
import { fechaValida } from "./validaciones.js";

function normalizarQuien(quien) {
  if (quien?.id == null || !quien.nombre) {
    throw new BadRequestError("El cambio de estado requiere saber quién lo realizó");
  }
  const esSistema = quien.id === ACTOR_SISTEMA.id;
  if (!esSistema && !quien.rol) {
    throw new BadRequestError("El cambio de estado requiere el rol de quien lo realizó");
  }
  return {
    id: String(quien.id),
    nombre: quien.nombre,
    rol: esSistema ? ROL_SISTEMA : quien.rol,
  };
}

/** Entrada del historial de una compra (trazabilidad de cada transición). */
export class CambioEstadoCompra {
  constructor({ estadoAnterior = null, estadoNuevo, quien, fechaHora, detalle = "" }) {
    if (!Object.values(EstadoCompra).includes(estadoNuevo)) {
      throw new BadRequestError("El estado nuevo de la compra no es válido");
    }
    this.estadoAnterior = estadoAnterior;
    this.estadoNuevo = estadoNuevo;
    this.quien = normalizarQuien(quien);
    this.fechaHora = fechaValida(fechaHora, "El cambio de estado requiere una fecha válida");
    this.detalle = detalle;
  }
}
