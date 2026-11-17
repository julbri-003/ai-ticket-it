import { RepositorioPersistible } from "../RepositorioPersistible.js";
import { esIdValido, nuevoId } from "./ids.js";

/**
 * Guardado común en Mongo para entidades Persistible.
 * Cada subclase declara model = SuModelo e implementa mapearCampos(entidad) e
 * hidratar(doc) → entidad de dominio. El mapeo de auditoría y delete se heredan.
 * guardar devuelve siempre una entidad de dominio (no un documento de mongoose).
 */
export class RepositorioMongoPersistible extends RepositorioPersistible {
  async guardar(entidad) {
    const query = { _id: entidad.id ?? nuevoId() };
    const doc = await this.model.findOneAndUpdate(query, this.mapearParaPersistir(entidad), {
      new: true,
      runValidators: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
    return this.hidratar(doc);
  }

  /** Busca por id; un id con formato inválido devuelve null (en lugar de un CastError). */
  async obtenerPorId(id, { incluirInactivos = false } = {}) {
    if (!esIdValido(id)) return null;
    const consulta = this.model.findById(id);
    if (incluirInactivos) consulta.incluirInactivos();
    return this.hidratar(await consulta.lean());
  }

  hidratar() {
    throw new Error("El repositorio debe implementar hidratar(doc)");
  }
}
