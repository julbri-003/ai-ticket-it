import { Compra } from "../../domain/compraDominio.js";
import { EstadoCompra } from "../../domain/estadoCompraDominio.js";
import { Mensaje } from "../../domain/mensajeDominio.js";
import { NotFoundError } from "../../errors/AppError.js";
import { CompraModel } from "../../schemas/compraSchema.js";
import { EventoModel } from "../../schemas/eventoSchema.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, aObjectId, esIdValido, nuevoId, plano } from "./ids.js";

function mapearMensaje(mensaje) {
  return {
    _id: aObjectId(mensaje.id ?? nuevoId()),
    usuarioId: String(mensaje.usuarioId),
    usuarioNombre: mensaje.usuarioNombre,
    rol: mensaje.rol,
    mensaje: mensaje.mensaje,
    enviado: mensaje.enviado,
  };
}

function hidratarMensaje(m) {
  return new Mensaje({ ...m, id: aIdDominio(m._id) });
}

function filtroEstado(estado) {
  return estado ? { estado } : {};
}

export class ComprasMongoRepository extends RepositorioMongoPersistible {
  constructor() {
    super();
    this.model = CompraModel;
  }

  /** Todo menos los mensajes: se agregan solo con agregarMensaje ($push). */
  mapearCampos(compra) {
    return {
      compradorId: aObjectId(compra.compradorId),
      eventoId: aObjectId(compra.eventoId),
      organizadorId: aObjectId(compra.organizadorId),
      tipoEntradaId: aObjectId(compra.tipoEntradaId),
      tipoEntradaNombre: compra.tipoEntradaNombre,
      precioUnitario: compra.precioUnitario,
      cantidad: compra.cantidad,
      total: compra.total,
      estado: compra.estado,
      historial: compra.historial,
      fechaCompra: compra.fechaCompra,
      fechaLimitePago: compra.fechaLimitePago,
      motivoCancelacion: compra.motivoCancelacion,
      reembolsoPendiente: compra.reembolsoPendiente,
      fechaLimiteReembolso: compra.fechaLimiteReembolso,
      reseniaId: compra.reseniaId == null ? null : aObjectId(compra.reseniaId),
    };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    return new Compra({
      ...datos,
      id: aIdDominio(datos._id),
      compradorId: aIdDominio(datos.compradorId),
      eventoId: aIdDominio(datos.eventoId),
      organizadorId: aIdDominio(datos.organizadorId),
      tipoEntradaId: aIdDominio(datos.tipoEntradaId),
      reseniaId: aIdDominio(datos.reseniaId),
      mensajes: (datos.mensajes ?? []).map(hidratarMensaje),
    });
  }

  /**
   * Alta con todos los campos (incluidos los mensajes iniciales). En una modificación no se
   * reescriben los mensajes, para no perder uno agregado en paralelo con agregarMensaje.
   */
  async guardar(compra) {
    if (compra.id == null) {
      const doc = await this.model.create({
        _id: aObjectId(nuevoId()),
        ...this.mapearParaPersistir(compra),
        mensajes: compra.mensajes.map(mapearMensaje),
      });
      return this.hidratar(doc);
    }
    const doc = await this.model.findOneAndUpdate(
      { _id: compra.id },
      {
        $set: this.mapearParaPersistir(compra),
        $setOnInsert: { mensajes: compra.mensajes.map(mapearMensaje) },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return this.hidratar(doc);
  }

  async listarPorComprador(compradorId, { estado } = {}) {
    if (!esIdValido(compradorId)) return [];
    const docs = await this.model
      .find({ compradorId, ...filtroEstado(estado) })
      .sort({ fechaCompra: -1 })
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  async listarPorEvento(eventoId, { estado } = {}) {
    if (!esIdValido(eventoId)) return [];
    const docs = await this.model
      .find({ eventoId, ...filtroEstado(estado) })
      .sort({ fechaCompra: -1 })
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  /** PENDIENTE cuya fecha límite de pago ya llegó (para vencerlas). */
  async listarPendientesVencidas(ahora) {
    const docs = await this.model
      .find({ estado: EstadoCompra.PENDIENTE, fechaLimitePago: { $lte: ahora } })
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  /** CANCELADA con reembolso pendiente y plazo del organizador vencido. */
  async listarReembolsosVencidos(ahora) {
    const docs = await this.model
      .find({
        estado: EstadoCompra.CANCELADA,
        reembolsoPendiente: true,
        fechaLimiteReembolso: { $lte: ahora },
      })
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  /** CONFIRMADA de eventos que ya ocurrieron (join con eventos, incluso finalizados). */
  async listarConfirmadasDeEventosOcurridos(ahora) {
    const docs = await this.model.aggregate([
      { $match: { estado: EstadoCompra.CONFIRMADA, activo: true } },
      {
        $lookup: {
          from: EventoModel.collection.name,
          localField: "eventoId",
          foreignField: "_id",
          as: "evento",
          pipeline: [{ $project: { fecha: 1 } }],
        },
      },
      { $match: { "evento.fecha": { $lte: ahora } } },
      { $project: { evento: 0 } },
    ]);
    return docs.map((doc) => this.hidratar(doc));
  }

  /** Conteo de compras por estado de varios eventos: { [eventoId]: { PENDIENTE: n, ... } }. */
  async contarPorEstado(eventoIds = []) {
    const validos = eventoIds.filter(esIdValido).map(aObjectId);
    const conteos = Object.fromEntries(
      eventoIds.map((id) => [
        String(id),
        Object.fromEntries(Object.values(EstadoCompra).map((e) => [e, 0])),
      ]),
    );
    if (validos.length === 0) return conteos;
    const filas = await this.model.aggregate([
      { $match: { eventoId: { $in: validos }, activo: true } },
      { $group: { _id: { eventoId: "$eventoId", estado: "$estado" }, cantidad: { $sum: 1 } } },
    ]);
    for (const { _id, cantidad } of filas) {
      conteos[String(_id.eventoId)][_id.estado] = cantidad;
    }
    return conteos;
  }

  /** Ids de los eventos que el comprador compró en alguno de los estados indicados. */
  async listarEventosComprados(compradorId, estados = []) {
    if (!esIdValido(compradorId)) return [];
    const ids = await this.model.distinct("eventoId", {
      compradorId: aObjectId(compradorId),
      activo: true,
      ...(estados.length > 0 && { estado: { $in: estados } }),
    });
    return ids.map(aIdDominio);
  }

  /** Agrega un mensaje con $push, sin reescribir la compra. Devuelve el Mensaje con id. */
  async agregarMensaje(compraId, mensaje) {
    const mapeado = mapearMensaje(mensaje);
    const resultado = esIdValido(compraId)
      ? await this.model.updateOne({ _id: compraId }, { $push: { mensajes: mapeado } })
      : { matchedCount: 0 };
    if (resultado.matchedCount === 0) {
      throw new NotFoundError("No existe la compra indicada");
    }
    return hidratarMensaje(mapeado);
  }
}
