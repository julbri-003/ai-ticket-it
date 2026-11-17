import { Evento } from "../../domain/eventoDominio.js";
import { Roles } from "../../domain/rolesDominio.js";
import { ConflictError, NotFoundError } from "../../errors/AppError.js";
import { EventoModel } from "../../schemas/eventoSchema.js";
import { UsuarioModel } from "../../schemas/usuarioSchema.js";
import { escaparRegex, normalizarTexto } from "../../utils/normalizar.js";
import { reloj as relojSistema } from "../../utils/reloj.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, aObjectId, esIdValido, nuevoId, paginacion, plano } from "./ids.js";

export const OrdenEventos = Object.freeze({
  FECHA: "fecha",
  PRECIO: "precio",
  PUNTAJE: "puntaje",
  // Solo con pesosCategorias ("Para vos" / recomendados): peso de la categoría desc, luego fecha.
  RELEVANCIA: "relevancia",
});

const CAMPO_ORDEN = {
  [OrdenEventos.FECHA]: "fecha",
  [OrdenEventos.PRECIO]: "precioMinimo",
  [OrdenEventos.PUNTAJE]: "puntajeOrganizador",
  [OrdenEventos.RELEVANCIA]: "relevancia",
};

/** Peso de la categoría de cada evento ($switch no admite una lista de casos vacía). */
function expresionRelevancia(pesosCategorias) {
  const casos = pesosCategorias
    .filter((p) => esIdValido(p.categoriaId))
    .map((p) => ({ case: { $eq: ["$categoriaId", aObjectId(p.categoriaId)] }, then: p.peso }));
  return casos.length > 0 ? { $switch: { branches: casos, default: 0 } } : { $literal: 0 };
}

function mapearTipoEntrada(tipo) {
  return {
    _id: aObjectId(tipo.id ?? nuevoId()),
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    precio: tipo.precio,
    cupo: tipo.cupo,
    disponibles: tipo.disponibles,
  };
}

function textoBusqueda(evento) {
  return normalizarTexto(
    [
      evento.nombre,
      evento.descripcion,
      ...(evento.ampliacionesDescripcion ?? []).map((a) => a.texto),
      evento.lugar,
    ].join(" "),
  );
}

function aFecha(valor) {
  return valor == null ? undefined : new Date(valor);
}

export class EventosMongoRepository extends RepositorioMongoPersistible {
  constructor({ reloj = relojSistema } = {}) {
    super();
    this.model = EventoModel;
    this.reloj = reloj;
  }

  /** Campos del evento salvo los tipos de entrada (ver guardar). */
  mapearCampos(evento) {
    return {
      nombre: evento.nombre,
      descripcion: evento.descripcion,
      ampliacionesDescripcion: evento.ampliacionesDescripcion,
      categoriaId: aObjectId(evento.categoriaId),
      fecha: evento.fecha,
      lugar: evento.lugar,
      multimedia: evento.multimedia,
      organizadorId: aObjectId(evento.organizadorId),
      textoBusqueda: textoBusqueda(evento),
    };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    return new Evento({
      ...datos,
      id: aIdDominio(datos._id),
      categoriaId: aIdDominio(datos.categoriaId),
      organizadorId: aIdDominio(datos.organizadorId),
      tiposEntrada: (datos.tiposEntrada ?? []).map((t) => ({ ...t, id: aIdDominio(t._id) })),
    });
  }

  /**
   * Alta: inserta el evento completo. Modificación: actualiza los campos editables y agrega
   * con $push solo los tipos de entrada nuevos (los que todavía no tienen id). Nunca reescribe
   * `disponibles` de los tipos existentes: eso lo hacen reservarCupo/liberarCupo de forma
   * atómica, y pisarlo con una copia en memoria podría perder una reserva concurrente.
   */
  async guardar(evento) {
    const existente =
      evento.id != null &&
      esIdValido(evento.id) &&
      (await this.model.findById(evento.id).incluirInactivos().select("_id").lean());

    if (!existente) {
      const doc = await this.model.create({
        _id: aObjectId(evento.id ?? nuevoId()),
        ...this.mapearParaPersistir(evento),
        tiposEntrada: evento.tiposEntrada.map(mapearTipoEntrada),
      });
      return this.hidratar(doc);
    }

    const nuevos = evento.tiposEntrada.filter((t) => t.id == null).map(mapearTipoEntrada);
    const doc = await this.model
      .findOneAndUpdate(
        { _id: evento.id },
        {
          $set: this.mapearParaPersistir(evento),
          ...(nuevos.length > 0 && { $push: { tiposEntrada: { $each: nuevos } } }),
        },
        { new: true, runValidators: true },
      )
      .lean();
    return this.hidratar(doc);
  }

  async obtenerPorId(id, { incluirInactivos = false } = {}) {
    return super.obtenerPorId(id, { incluirInactivos });
  }

  /** Búsqueda exacta por nombre (incluye finalizados). La usan los seeds para ser idempotentes. */
  async obtenerPorNombre(nombre) {
    const doc = await this.model.findOne({ nombre }).incluirInactivos().lean();
    return this.hidratar(doc);
  }

  /** Eventos del organizador, activos y finalizados, del más reciente al más antiguo. */
  async listarPorOrganizador(organizadorId) {
    if (!esIdValido(organizadorId)) return [];
    const docs = await this.model
      .find({ organizadorId })
      .incluirInactivos()
      .sort({ fecha: -1 })
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  async obtenerVarios(ids = [], { incluirInactivos = true } = {}) {
    const validos = [...new Set(ids.map(String))].filter(esIdValido);
    if (validos.length === 0) return [];
    const consulta = this.model.find({ _id: { $in: validos } });
    if (incluirInactivos) consulta.incluirInactivos();
    return (await consulta.lean()).map((doc) => this.hidratar(doc));
  }

  /** Eventos activos cuya fecha ya pasó: candidatos a finalizar (baja lógica). */
  async listarParaFinalizar(ahora = this.reloj.ahora()) {
    const docs = await this.model.find({ fecha: { $lte: ahora } }).lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  /**
   * Reserva atómica: descuenta `cantidad` solo si el tipo tiene esa cantidad disponible.
   * La condición y el $inc van en una sola operación, así dos compras concurrentes no
   * pueden sobrevender. Si no hay cupo lanza ConflictError.
   */
  async reservarCupo(eventoId, tipoEntradaId, cantidad) {
    if (!esIdValido(eventoId) || !esIdValido(tipoEntradaId)) {
      throw new NotFoundError("No existe el evento o el tipo de entrada");
    }
    const tipoId = aObjectId(tipoEntradaId);
    const resultado = await this.model.updateOne(
      {
        _id: aObjectId(eventoId),
        activo: true,
        tiposEntrada: { $elemMatch: { _id: tipoId, disponibles: { $gte: cantidad } } },
      },
      { $inc: { "tiposEntrada.$[tipo].disponibles": -cantidad } },
      { arrayFilters: [{ "tipo._id": tipoId }] },
    );
    if (resultado.modifiedCount === 1) return;

    const existe = await this.model.exists({ _id: eventoId, "tiposEntrada._id": tipoId });
    if (!existe) {
      throw new NotFoundError("No existe el evento o el tipo de entrada");
    }
    throw new ConflictError("No hay cupo suficiente");
  }

  /** Operación inversa de reservarCupo, atómica y sin superar nunca el cupo del tipo. */
  async liberarCupo(eventoId, tipoEntradaId, cantidad) {
    const tipoId = aObjectId(tipoEntradaId);
    await this.model.updateOne({ _id: aObjectId(eventoId), "tiposEntrada._id": tipoId }, [
      {
        $set: {
          tiposEntrada: {
            $map: {
              input: "$tiposEntrada",
              as: "tipo",
              in: {
                $cond: [
                  { $eq: ["$$tipo._id", tipoId] },
                  {
                    $mergeObjects: [
                      "$$tipo",
                      {
                        disponibles: {
                          $min: ["$$tipo.cupo", { $add: ["$$tipo.disponibles", cantidad] }],
                        },
                      },
                    ],
                  },
                  "$$tipo",
                ],
              },
            },
          },
        },
      },
    ]);
  }

  /**
   * Buscador con filtros combinables. Devuelve { items: Evento[], total, pagina, limite }.
   * - q: texto parcial, sin mayúsculas ni acentos, en nombre, descripción, ampliaciones, lugar
   *   y nombre del organizador.
   * - precioMin/precioMax: algún tipo de entrada con precio en el rango (extremos opcionales).
   * - anteriores=true: eventos ya ocurridos o finalizados; si no, activos con fecha > ahora.
   * - categoriaIds: si viene un array (aunque esté vacío) filtra por esas categorías.
   * - orden: fecha | precio (precio mínimo) | puntaje (del organizador) | relevancia (peso de la
   *   categoría según pesosCategorias: [{ categoriaId, peso }]); direccion asc | desc.
   */
  async buscar({
    q,
    categoriaIds,
    precioMin,
    precioMax,
    fechaDesde,
    fechaHasta,
    conDisponibilidad = false,
    puntajeMin,
    organizadorId,
    excluirIds,
    pesosCategorias = [],
    orden = OrdenEventos.FECHA,
    direccion,
    pagina,
    limite,
    anteriores = false,
    ahora = this.reloj.ahora(),
  } = {}) {
    const filtros = [];

    filtros.push(
      anteriores
        ? { $or: [{ activo: false }, { fecha: { $lte: ahora } }] }
        : { activo: true, fecha: { $gt: ahora } },
    );

    if (Array.isArray(categoriaIds)) {
      filtros.push({ categoriaId: { $in: categoriaIds.filter(esIdValido).map(aObjectId) } });
    }
    if (organizadorId != null) {
      filtros.push({ organizadorId: esIdValido(organizadorId) ? aObjectId(organizadorId) : null });
    }
    if (excluirIds?.length) {
      filtros.push({ _id: { $nin: excluirIds.filter(esIdValido).map(aObjectId) } });
    }
    if (fechaDesde != null || fechaHasta != null) {
      filtros.push({
        fecha: {
          ...(fechaDesde != null && { $gte: aFecha(fechaDesde) }),
          ...(fechaHasta != null && { $lte: aFecha(fechaHasta) }),
        },
      });
    }
    if (precioMin != null || precioMax != null) {
      filtros.push({
        tiposEntrada: {
          $elemMatch: {
            precio: {
              ...(precioMin != null && { $gte: Number(precioMin) }),
              ...(precioMax != null && { $lte: Number(precioMax) }),
            },
          },
        },
      });
    }
    if (conDisponibilidad) {
      filtros.push({ tiposEntrada: { $elemMatch: { disponibles: { $gt: 0 } } } });
    }
    if (q != null && normalizarTexto(q)) {
      const patron = new RegExp(escaparRegex(normalizarTexto(q)));
      const organizadores = await UsuarioModel.find({
        rol: Roles.ORGANIZADOR,
        nombreBusqueda: patron,
      })
        .incluirInactivos()
        .select("_id")
        .lean();
      filtros.push({
        $or: [
          { textoBusqueda: patron },
          { organizadorId: { $in: organizadores.map((o) => o._id) } },
        ],
      });
    }

    const campoOrden = CAMPO_ORDEN[orden] ?? CAMPO_ORDEN[OrdenEventos.FECHA];
    const porDefecto =
      orden === OrdenEventos.PUNTAJE ||
      orden === OrdenEventos.RELEVANCIA ||
      (orden === OrdenEventos.FECHA && anteriores)
        ? -1
        : 1;
    const sentido = direccion === "desc" ? -1 : direccion === "asc" ? 1 : porDefecto;
    const { pagina: p, limite: l, saltear } = paginacion({ pagina, limite });
    // Desempates estables (fecha y _id) sin pisar el campo principal si ya es la fecha.
    const ordenamiento = { [campoOrden]: sentido };
    if (campoOrden !== "fecha") ordenamiento.fecha = 1;
    ordenamiento._id = 1;

    const [resultado] = await this.model.aggregate([
      { $match: { $and: filtros } },
      {
        $lookup: {
          from: UsuarioModel.collection.name,
          localField: "organizadorId",
          foreignField: "_id",
          as: "organizador",
          pipeline: [{ $project: { puntajePromedio: 1 } }],
        },
      },
      {
        $addFields: {
          precioMinimo: { $min: "$tiposEntrada.precio" },
          puntajeOrganizador: {
            $ifNull: [{ $arrayElemAt: ["$organizador.puntajePromedio", 0] }, 0],
          },
          relevancia: expresionRelevancia(pesosCategorias),
        },
      },
      ...(puntajeMin != null
        ? [{ $match: { puntajeOrganizador: { $gte: Number(puntajeMin) } } }]
        : []),
      {
        $facet: {
          items: [
            { $sort: ordenamiento },
            { $skip: saltear },
            { $limit: l },
            { $project: { organizador: 0, precioMinimo: 0, puntajeOrganizador: 0, relevancia: 0 } },
          ],
          total: [{ $count: "cantidad" }],
        },
      },
    ]);

    return {
      items: resultado.items.map((doc) => this.hidratar(doc)),
      total: resultado.total[0]?.cantidad ?? 0,
      pagina: p,
      limite: l,
    };
  }
}
