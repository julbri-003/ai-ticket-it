import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import {
  fechaValida,
  idObligatorio,
  textoObligatorio,
  textoOpcional,
  validarPuntuacion,
} from "./validaciones.js";

export const MAX_CARACTERES_RESENIA = 1000;

/**
 * Reseña de una compra UTILIZADA. Una reseña por compra: la misma persona puede reseñar
 * varias compras del mismo evento (cada tipo de entrada puede tener otra experiencia).
 * Se crea con compra.crearResenia(), que valida que se pueda reseñar.
 */
export class Resenia extends Persistible {
  constructor({
    id = null,
    compraId,
    compradorId,
    compradorNombre,
    eventoId,
    organizadorId,
    tipoEntradaNombre,
    puntuacion,
    detalle = "",
    fecha,
    activo,
    fechaModificacion,
    modificadoPor,
  }) {
    super();
    this.id = id;
    this.compraId = idObligatorio(compraId, "La reseña debe pertenecer a una compra");
    this.compradorId = idObligatorio(compradorId, "La reseña debe tener un comprador");
    this.compradorNombre = textoObligatorio(compradorNombre, "La reseña debe tener un autor");
    this.eventoId = idObligatorio(eventoId, "La reseña debe pertenecer a un evento");
    this.organizadorId = idObligatorio(organizadorId, "La reseña debe tener un organizador");
    this.tipoEntradaNombre = textoObligatorio(
      tipoEntradaNombre,
      "La reseña debe indicar el tipo de entrada",
    );
    this.puntuacion = validarPuntuacion(puntuacion);
    this.detalle = textoOpcional(detalle, {
      campo: "El detalle de la reseña",
      max: MAX_CARACTERES_RESENIA,
    });
    this.fecha = fechaValida(fecha, "La reseña debe tener una fecha válida");
    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }
}
