import { BadRequestError, NotFoundError } from "../errors/AppError.js";

/**
 * Base exclusiva para repositorios de entidades Persistible.
 * Las subclases implementan obtenerPorId(id) y guardar(entidad), conservando
 * activo, fechaModificacion y modificadoPor en su almacenamiento.
 * Para construir un mapeo, mapearParaPersistir combina mapearCampos(entidad)
 * con la auditoría. Las subclases definen únicamente mapearCampos.
 *
 * delete realiza una baja lógica: nunca elimina físicamente el registro.
 * A diferencia de REPO_REF no hay proveedor de identidad de desarrollo: quien
 * da de baja siempre se recibe explícitamente (usuario de la petición o SISTEMA).
 */
export class RepositorioPersistible {
  async delete(id, usuarioActual, reloj) {
    if (usuarioActual?.id == null) {
      throw new BadRequestError("La baja requiere indicar quién la realiza");
    }
    const entidad = await this.obtenerPorId(id);
    if (!entidad) {
      throw new NotFoundError("No existe la entidad indicada");
    }
    entidad.darDeBaja({ ...usuarioActual, id: String(usuarioActual.id) }, reloj);
    return await this.guardar(entidad);
  }

  obtenerPorId() {
    throw new Error("El repositorio debe implementar obtenerPorId(id)");
  }

  guardar() {
    throw new Error("El repositorio debe implementar guardar(entidad)");
  }

  mapearParaPersistir(entidad) {
    return {
      ...this.mapearCampos(entidad),
      activo: entidad.activo,
      fechaModificacion: entidad.fechaModificacion,
      modificadoPor: entidad.modificadoPor,
    };
  }

  mapearCampos() {
    throw new Error("El repositorio debe implementar mapearCampos(entidad)");
  }
}
