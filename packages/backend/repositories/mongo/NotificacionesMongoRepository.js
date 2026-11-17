import { Notificacion } from "../../domain/notificacionDominio.js";
import { NotificacionModel } from "../../schemas/notificacionSchema.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, aObjectId, esIdValido, paginacion, plano } from "./ids.js";

export class NotificacionesMongoRepository extends RepositorioMongoPersistible {
  constructor() {
    super();
    this.model = NotificacionModel;
  }

  mapearCampos(notificacion) {
    const { compraId, eventoId } = notificacion.datos ?? {};
    return {
      destinatarioId: aObjectId(notificacion.destinatarioId),
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      datos: {
        ...(compraId != null && { compraId: aObjectId(compraId) }),
        ...(eventoId != null && { eventoId: aObjectId(eventoId) }),
      },
      fecha: notificacion.fecha,
      leida: notificacion.leida,
    };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    const { compraId, eventoId } = datos.datos ?? {};
    return new Notificacion({
      ...datos,
      id: aIdDominio(datos._id),
      destinatarioId: aIdDominio(datos.destinatarioId),
      datos: {
        ...(compraId != null && { compraId: aIdDominio(compraId) }),
        ...(eventoId != null && { eventoId: aIdDominio(eventoId) }),
      },
    });
  }

  async crear(notificacion) {
    const doc = await this.model.create(this.mapearParaPersistir(notificacion));
    return this.hidratar(doc);
  }

  /** Paginadas, de la más nueva a la más vieja. */
  async listarPorDestinatario(destinatarioId, { soloNoLeidas = false, ...opciones } = {}) {
    const { pagina, limite, saltear } = paginacion(opciones);
    if (!esIdValido(destinatarioId)) return { items: [], total: 0, pagina, limite };
    const filtro = { destinatarioId, ...(soloNoLeidas && { leida: false }) };
    const [docs, total] = await Promise.all([
      this.model.find(filtro).sort({ fecha: -1, _id: -1 }).skip(saltear).limit(limite).lean(),
      this.model.countDocuments(filtro),
    ]);
    return { items: docs.map((doc) => this.hidratar(doc)), total, pagina, limite };
  }

  async contarNoLeidas(destinatarioId) {
    if (!esIdValido(destinatarioId)) return 0;
    return this.model.countDocuments({ destinatarioId, leida: false });
  }

  /** Marca una notificación como leída. Devuelve la notificación o null si no existe. */
  async marcarLeida(id) {
    if (!esIdValido(id)) return null;
    const doc = await this.model
      .findOneAndUpdate({ _id: id, activo: true }, { $set: { leida: true } }, { new: true })
      .lean();
    return this.hidratar(doc);
  }

  /**
   * Marca como leídas las del destinatario de un tipo para una compra (por ejemplo, los
   * NUEVO_MENSAJE al abrir el chat). Devuelve cuántas cambiaron.
   */
  async marcarLeidasDeCompra(destinatarioId, compraId, tipo) {
    if (!esIdValido(destinatarioId) || !esIdValido(compraId)) return 0;
    const resultado = await this.model.updateMany(
      {
        destinatarioId,
        activo: true,
        leida: false,
        tipo,
        "datos.compraId": aObjectId(compraId),
      },
      { $set: { leida: true } },
    );
    return resultado.modifiedCount;
  }

  /**
   * "Limpiar": baja lógica de todas las notificaciones activas del destinatario (con la
   * auditoría del plugin Persistible). Dejan de listarse y de contarse. Devuelve cuántas.
   */
  async darDeBajaTodas(destinatarioId, { modificadoPor, fecha }) {
    if (!esIdValido(destinatarioId)) return 0;
    const resultado = await this.model.updateMany(
      { destinatarioId, activo: true },
      { $set: { activo: false, fechaModificacion: fecha, modificadoPor } },
    );
    return resultado.modifiedCount;
  }

  /** Marca como leídas todas las del destinatario. Devuelve cuántas cambiaron. */
  async marcarTodasLeidas(destinatarioId) {
    if (!esIdValido(destinatarioId)) return 0;
    const resultado = await this.model.updateMany(
      { destinatarioId, activo: true, leida: false },
      { $set: { leida: true } },
    );
    return resultado.modifiedCount;
  }
}
