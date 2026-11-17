import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import { textoObligatorio, textoOpcional } from "./validaciones.js";

/** Catálogo fijo de categorías de eventos (se siembra al arrancar). */
export class Categoria extends Persistible {
  constructor({ id = null, nombre, descripcion = "", activo, fechaModificacion, modificadoPor }) {
    super();
    this.id = id;
    this.nombre = textoObligatorio(nombre, "La categoría debe tener un nombre");
    this.descripcion = textoOpcional(descripcion, { campo: "La descripción", max: 500 });
    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }
}
