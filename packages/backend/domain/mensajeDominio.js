import { BadRequestError } from "../errors/AppError.js";
import { fechaValida, idObligatorio, textoObligatorio } from "./validaciones.js";

export const MAX_CARACTERES_MENSAJE = 1000;

/** Mensaje del chat de una compra entre el comprador y el organizador. */
export class Mensaje {
  constructor({ id = null, usuarioId, usuarioNombre, rol, mensaje, enviado }) {
    const texto = textoObligatorio(mensaje, "El mensaje no puede estar vacío");
    if (texto.length > MAX_CARACTERES_MENSAJE) {
      throw new BadRequestError(
        `El mensaje admite como máximo ${MAX_CARACTERES_MENSAJE} caracteres`,
      );
    }
    this.id = id;
    this.usuarioId = idObligatorio(usuarioId, "El mensaje debe tener un autor");
    this.usuarioNombre = textoObligatorio(usuarioNombre, "El mensaje debe tener un autor");
    this.rol = textoObligatorio(rol, "El mensaje debe indicar el rol del autor");
    this.mensaje = texto;
    this.enviado = fechaValida(enviado, "El mensaje debe tener una fecha de envío válida");
  }
}
