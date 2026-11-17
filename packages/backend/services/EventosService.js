import { Evento, TipoMultimedia } from "../domain/eventoDominio.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/AppError.js";
import { OrdenEventos } from "../repositories/mongo/EventosMongoRepository.js";
import { mismoId } from "../utils/id.js";

/**
 * Casos de uso de eventos: crear, buscar, detalle, "mis eventos" y edición restringida.
 * La edición siempre delega en los métodos del dominio; acá solo se verifica la titularidad.
 */
export class EventosService {
  constructor({
    eventosRepository,
    categoriasRepository,
    comprasRepository,
    almacenamiento,
    recomendacionesService,
    vistasEventos,
    reloj,
  }) {
    this.eventosRepository = eventosRepository;
    this.categoriasRepository = categoriasRepository;
    this.comprasRepository = comprasRepository;
    this.almacenamiento = almacenamiento;
    this.recomendacionesService = recomendacionesService;
    this.vistasEventos = vistasEventos;
    this.reloj = reloj;
  }

  async crear(datos, usuario) {
    const categoria = await this.categoriasRepository.obtenerPorId(datos.categoriaId);
    if (!categoria) {
      throw new BadRequestError("La categoría indicada no existe");
    }
    const evento = Evento.crear(
      { ...datos, organizadorId: usuario.id, multimedia: [] },
      this.reloj,
    );
    const guardado = await this.eventosRepository.guardar(evento);
    return this.vistasEventos.armarUna(guardado, usuario);
  }

  /**
   * Buscador. Con paraVos=true y sesión de comprador con favoritos, reemplaza categoriaIds por
   * las categorías preferidas (o su intersección con las pedidas) y habilita orden=relevancia.
   * Si no aplica, paraVos se ignora y filtrosAplicados.paraVos = false.
   */
  async buscar(filtros, usuario) {
    const { paraVos = false, ...resto } = filtros;
    const consulta = { ...resto };
    let paraVosAplicado = false;

    if (paraVos) {
      const { preferidas } = await this.recomendacionesService.preferenciasDe(usuario);
      if (preferidas.length > 0) {
        paraVosAplicado = true;
        const idsPreferidas = preferidas.map((p) => String(p.categoriaId));
        consulta.categoriaIds = filtros.categoriaIds
          ? filtros.categoriaIds.filter((id) => idsPreferidas.includes(String(id)))
          : idsPreferidas;
        consulta.pesosCategorias = preferidas;
      }
    }
    if (consulta.orden === OrdenEventos.RELEVANCIA && !paraVosAplicado) {
      consulta.orden = OrdenEventos.FECHA;
    }

    const resultado = await this.eventosRepository.buscar(consulta);
    return {
      ...resultado,
      items: await this.vistasEventos.armar(resultado.items, usuario),
      filtrosAplicados: {
        ...resto,
        ...(consulta.categoriaIds && { categoriaIds: consulta.categoriaIds }),
        orden: consulta.orden ?? OrdenEventos.FECHA,
        paraVos: paraVosAplicado,
      },
    };
  }

  /** Detalle público. Incluye eventos finalizados ("Eventos anteriores"). */
  async detalle(id, usuario) {
    const evento = await this.#obtener(id);
    return this.vistasEventos.armarUna(evento, usuario);
  }

  /** Eventos del organizador (activos y anteriores) con conteo de compras por estado. */
  async listarMios(usuario) {
    const eventos = await this.eventosRepository.listarPorOrganizador(usuario.id);
    const [vistas, conteos] = await Promise.all([
      this.vistasEventos.armar(eventos, usuario),
      this.comprasRepository.contarPorEstado(eventos.map((e) => e.id)),
    ]);
    return vistas.map((vista) => ({ ...vista, comprasPorEstado: conteos[vista.evento.id] }));
  }

  // ----- Edición restringida (solo el organizador dueño) -----

  /**
   * @param archivos [{ buffer, mimetype, originalname }] (de multer)
   * @param alts textos alternativos en el mismo orden que los archivos
   */
  async agregarMultimedia(id, archivos, alts, usuario) {
    const evento = await this.#obtenerPropio(id, usuario);
    if (alts.length > archivos.length) {
      throw new BadRequestError("Hay más textos alternativos que archivos");
    }
    // El middleware ya filtró los tipos permitidos; acá solo se distingue imagen de video.
    const tipos = archivos.map((a) =>
      a.mimetype.startsWith("video/") ? TipoMultimedia.VIDEO : TipoMultimedia.IMAGEN,
    );
    tipos.forEach((tipo, i) => {
      if (tipo === TipoMultimedia.IMAGEN && !alts[i]?.trim()) {
        throw new BadRequestError(
          `Falta el texto alternativo de la imagen "${archivos[i].originalname}": describí qué se ve en ella`,
        );
      }
    });

    const rutas = [];
    try {
      for (const archivo of archivos) rutas.push(await this.almacenamiento.guardar(archivo));
      evento.agregarMultimedia(
        rutas.map((ruta, i) => ({ ruta, tipo: tipos[i], alt: alts[i] ?? "" })),
        this.reloj,
      );
      const guardado = await this.eventosRepository.guardar(evento);
      return this.vistasEventos.armarUna(guardado, usuario);
    } catch (error) {
      // Compensación: si el dominio o la base rechazan el cambio, no quedan archivos huérfanos.
      await Promise.all(rutas.map((ruta) => this.almacenamiento.eliminar(ruta)));
      throw error;
    }
  }

  async quitarMultimedia(id, ruta, usuario) {
    const evento = await this.#obtenerPropio(id, usuario);
    evento.quitarMultimedia(ruta, this.reloj);
    const guardado = await this.eventosRepository.guardar(evento);
    await this.almacenamiento.eliminar(ruta);
    return this.vistasEventos.armarUna(guardado, usuario);
  }

  async agregarTipoEntrada(id, tipo, usuario) {
    const evento = await this.#obtenerPropio(id, usuario);
    evento.agregarTipoEntrada(tipo, this.reloj);
    return this.vistasEventos.armarUna(await this.eventosRepository.guardar(evento), usuario);
  }

  async ampliarDescripcion(id, texto, usuario) {
    const evento = await this.#obtenerPropio(id, usuario);
    evento.ampliarDescripcion(texto, this.reloj);
    return this.vistasEventos.armarUna(await this.eventosRepository.guardar(evento), usuario);
  }

  async #obtener(id) {
    const evento = await this.eventosRepository.obtenerPorId(id, { incluirInactivos: true });
    if (!evento) {
      throw new NotFoundError("No existe el evento indicado");
    }
    return evento;
  }

  async #obtenerPropio(id, usuario) {
    const evento = await this.#obtener(id);
    if (!mismoId(evento.organizadorId, usuario?.id)) {
      throw new ForbiddenError("Solo el organizador del evento puede modificarlo");
    }
    return evento;
  }
}
