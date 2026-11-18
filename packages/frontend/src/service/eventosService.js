import { categoriasApi } from "./apis/categoriasApi";
import { eventosApi } from "./apis/eventosApi";
import { reseniasApi } from "./apis/reseniasApi";
import { quedanPocasEntradas } from "./publicoService";
import {
  chipFecha,
  diaMesTexto,
  fechaHoraTexto,
  fechaLargaTexto,
  horaTexto,
} from "../utils/fechas";
import { montoTexto, precioTexto } from "../utils/montos";

/** Cupo que le queda a un tipo de entrada: "Agotado", "¡Es la última!" o "Quedan N". */
export function quedanTexto(quedan) {
  if (quedan === 0) return "Agotado";
  if (quedan === 1) return "¡Es la última!";
  return `Quedan ${quedan}`;
}

function aTipoEntrada(dto) {
  const quedan = dto.disponibles;
  return {
    id: dto.id,
    nombre: dto.nombre,
    descripcion: dto.descripcion ?? "",
    precio: dto.precio,
    precioTexto: montoTexto(dto.precio),
    disponibles: quedan,
    agotado: quedan === 0,
    quedanTexto: quedanTexto(quedan),
  };
}

/** DTO de evento → modelo de UI. */
export function aEvento(dto) {
  return {
    id: dto.id,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    ampliaciones: (dto.ampliacionesDescripcion ?? []).map((a) => ({
      texto: a.texto,
      fechaTexto: `Actualización del ${diaMesTexto(a.fecha)}`,
    })),
    categoria: dto.categoria ?? { id: null, nombre: "" },
    fecha: dto.fecha,
    fechaTexto: fechaHoraTexto(dto.fecha),
    fechaLargaTexto: `${fechaLargaTexto(dto.fecha)} · ${horaTexto(dto.fecha)} h`,
    lugar: dto.lugar,
    ubicacion: dto.ubicacion ?? null,
    tiposEntrada: (dto.tiposEntrada ?? []).map(aTipoEntrada),
    imagenes: (dto.multimedia ?? [])
      .filter((m) => m.tipo === "imagen")
      .map((m) => ({ uri: m.url, alt: m.alt })),
    videos: (dto.multimedia ?? [])
      .filter((m) => m.tipo === "video")
      .map((m) => ({ uri: m.url, alt: m.alt })),
    imagen: dto.imagen ? { uri: dto.imagen.url, alt: dto.imagen.alt } : null,
    precioMinimo: dto.precioMinimo,
    desdeTexto: `Desde ${precioTexto(dto.precioMinimo)}`,
    agotado: dto.agotado,
    // "Últimas entradas": ≤ 10 % del cupo total y no agotado (misma regla que la landing).
    quedanPocas: !dto.agotado && quedanPocasEntradas(dto.tiposEntrada),
    ...chipFecha(dto.fecha),
    yaOcurrio: dto.yaOcurrio,
    finalizado: dto.finalizado,
    cancelado: dto.cancelado ?? false,
    motivoCancelacion: dto.cancelacion?.motivo ?? null,
    canceladoTexto: dto.cancelacion ? `Cancelado el ${diaMesTexto(dto.cancelacion.fecha)}` : null,
    // Un evento cancelado va en "Cancelados", no en "Anteriores".
    anterior: !dto.cancelado && (dto.yaOcurrio || dto.finalizado),
    organizador: {
      id: dto.organizador?.id,
      nombre: dto.organizador?.nombre ?? "",
      puntaje: dto.organizador?.puntajePromedio ?? 0,
      cantidadResenias: dto.organizador?.cantidadResenias ?? 0,
    },
    esFavorito: dto.esFavorito ?? false,
  };
}

function aResenia(dto) {
  return {
    id: dto.id,
    autor: dto.compradorNombre,
    puntuacion: dto.puntuacion,
    detalle: dto.detalle,
    fechaTexto: diaMesTexto(dto.fecha),
    tipoEntrada: dto.tipoEntradaNombre,
    evento: dto.evento?.nombre ?? "",
  };
}

export const eventosService = {
  async buscar(query) {
    const resultado = await eventosApi.buscar(query);
    return { ...resultado, items: resultado.items.map(aEvento) };
  },

  /** Cantidad de resultados para una query (conteo en vivo del panel de filtros). */
  async contar(query) {
    const { total } = await eventosApi.buscar({ ...query, pagina: 1, limite: 1 });
    return total;
  },

  async recomendados({ pagina = 1, limite = 10 } = {}) {
    const resultado = await eventosApi.recomendados({ pagina, limite });
    return { ...resultado, items: resultado.items.map(aEvento) };
  },

  async detalle(id) {
    return aEvento(await eventosApi.detalle(id));
  },

  async resenias(eventoId, { pagina = 1, limite = 5 } = {}) {
    const resultado = await reseniasApi.delOrganizadorDelEvento(eventoId, { pagina, limite });
    return { ...resultado, items: resultado.items.map(aResenia) };
  },

  categorias: () => categoriasApi.listar(),
};

export default eventosService;
