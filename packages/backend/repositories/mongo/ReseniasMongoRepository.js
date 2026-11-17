import { Resenia } from "../../domain/reseniaDominio.js";
import { ConflictError } from "../../errors/AppError.js";
import { ReseniaModel } from "../../schemas/reseniaSchema.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, aObjectId, esDuplicado, esIdValido, paginacion, plano } from "./ids.js";

export class ReseniasMongoRepository extends RepositorioMongoPersistible {
  constructor() {
    super();
    this.model = ReseniaModel;
  }

  mapearCampos(resenia) {
    return {
      compraId: aObjectId(resenia.compraId),
      compradorId: aObjectId(resenia.compradorId),
      compradorNombre: resenia.compradorNombre,
      eventoId: aObjectId(resenia.eventoId),
      organizadorId: aObjectId(resenia.organizadorId),
      tipoEntradaNombre: resenia.tipoEntradaNombre,
      puntuacion: resenia.puntuacion,
      detalle: resenia.detalle,
      fecha: resenia.fecha,
    };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    return new Resenia({
      ...datos,
      id: aIdDominio(datos._id),
      compraId: aIdDominio(datos.compraId),
      compradorId: aIdDominio(datos.compradorId),
      eventoId: aIdDominio(datos.eventoId),
      organizadorId: aIdDominio(datos.organizadorId),
    });
  }

  /** Inserta una reseña nueva. El índice único de compraId impide una segunda reseña. */
  async crear(resenia) {
    try {
      const doc = await this.model.create(this.mapearParaPersistir(resenia));
      return this.hidratar(doc);
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictError("Esta compra ya tiene una reseña");
      }
      throw error;
    }
  }

  /** Borrado físico: solo para compensar una reseña que no se pudo completar. */
  async eliminar(id) {
    if (!esIdValido(id)) return false;
    return (await this.model.deleteOne({ _id: id })).deletedCount === 1;
  }

  async existeParaCompra(compraId) {
    if (!esIdValido(compraId)) return false;
    return (await this.model.exists({ compraId }).incluirInactivos()) != null;
  }

  /** Reseñas de todos los eventos de un organizador, de la más nueva a la más vieja. */
  async listarPorOrganizador(organizadorId, opciones = {}) {
    const { pagina, limite, saltear } = paginacion(opciones);
    if (!esIdValido(organizadorId)) return { items: [], total: 0, pagina, limite };
    const filtro = { organizadorId };
    const [docs, total] = await Promise.all([
      this.model.find(filtro).sort({ fecha: -1, _id: -1 }).skip(saltear).limit(limite).lean(),
      this.model.countDocuments(filtro),
    ]);
    return { items: docs.map((doc) => this.hidratar(doc)), total, pagina, limite };
  }

  async listarPorEvento(eventoId) {
    if (!esIdValido(eventoId)) return [];
    const docs = await this.model.find({ eventoId }).sort({ fecha: -1 }).lean();
    return docs.map((doc) => this.hidratar(doc));
  }
}
