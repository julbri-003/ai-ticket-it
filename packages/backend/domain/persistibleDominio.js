import { BadRequestError } from "../errors/AppError.js";

/**
 * Base de las entidades que admiten baja lógica y auditoría.
 *
 * El usuarioActual representa la identidad que ejecuta una operación, no el
 * token de autenticación. Puede contener nombre y otros datos, pero la
 * auditoría conserva únicamente su id estable en modificadoPor.
 * El repositorio obtiene esta identidad del proveedor y la pasa a la entidad.
 * Así esta clase no depende de HTTP, JWT ni de cómo se autentica al usuario.
 * fechaModificacion permanece en null hasta una modificación posterior al alta.
 *
 * El reloj es opcional para poder fijar la fecha de auditoría en los tests.
 */
export class Persistible {
  constructor() {
    this.activo = true;
    this.fechaModificacion = null;
    this.modificadoPor = null;
  }

  darDeBaja(usuarioActual, reloj) {
    if (typeof usuarioActual?.id !== "string" || !usuarioActual.id.trim()) {
      throw new BadRequestError("La baja requiere un usuario actual con id válido");
    }

    // Repetir la baja no debe reemplazar la auditoría de la baja original.
    if (!this.activo) return;

    this.activo = false;
    this.fechaModificacion = reloj ? reloj.ahora() : new Date();
    this.modificadoPor = usuarioActual.id;
  }

  darDeAlta(usuarioActual, reloj) {
    if (typeof usuarioActual?.id !== "string" || !usuarioActual.id.trim()) {
      throw new BadRequestError("El alta requiere un usuario actual con id válido");
    }

    if (this.activo) return;

    this.activo = true;
    this.fechaModificacion = reloj ? reloj.ahora() : new Date();
    this.modificadoPor = usuarioActual.id;
  }
}

/** Restaura los campos de auditoría al hidratar una entidad desde la base. */
export function restaurarAuditoria(entidad, { activo, fechaModificacion, modificadoPor }) {
  if (activo !== undefined) entidad.activo = activo;
  entidad.fechaModificacion = fechaModificacion || null;
  entidad.modificadoPor = modificadoPor || null;
}
