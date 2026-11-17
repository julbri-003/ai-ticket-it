import { publicoApi } from "./apis/publicoApi";
import { chipFecha } from "../utils/fechas";

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const formatoFecha = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatearPrecio = (monto) => formatoPrecio.format(monto);
export const formatearFecha = (iso) => formatoFecha.format(new Date(iso));

/**
 * true si queda el 10 % o menos del cupo total del evento y no está agotado ("Últimas
 * entradas"). Usa los disponibles por tipo que ya trae el DTO del buscador.
 */
export function quedanPocasEntradas(tiposEntrada = []) {
  const cupo = tiposEntrada.reduce((suma, t) => suma + (t.cupo ?? 0), 0);
  const disponibles = tiposEntrada.reduce((suma, t) => suma + (t.disponibles ?? 0), 0);
  return cupo > 0 && disponibles > 0 && disponibles <= cupo * 0.1;
}

/** Evento del buscador → tarjeta de la landing. */
function aEventoResumen(dto) {
  return {
    id: dto.id,
    nombre: dto.nombre,
    categoria: dto.categoria?.nombre ?? "",
    fecha: formatearFecha(dto.fecha),
    lugar: dto.lugar,
    desde: `Desde ${formatearPrecio(dto.precioMinimo)}`,
    imagen: dto.imagen ? { uri: dto.imagen.url, alt: dto.imagen.alt } : null,
    agotado: dto.agotado,
    quedanPocas: !dto.agotado && quedanPocasEntradas(dto.tiposEntrada),
    ...chipFecha(dto.fecha),
  };
}

export const publicoService = {
  async resumen() {
    const {
      estadisticas,
      eventosPorCategoria = {},
      reseniasDestacadas,
    } = await publicoApi.resumen();
    return {
      estadisticas,
      eventosPorCategoria,
      resenias: reseniasDestacadas.map((r) => ({
        id: r.id,
        autor: r.compradorNombre,
        puntuacion: r.puntuacion,
        detalle: r.detalle,
        evento: r.evento?.nombre ?? "",
      })),
    };
  },
  categorias: () => publicoApi.categorias(),
  async proximosEventos(limite) {
    const { items } = await publicoApi.proximosEventos(limite);
    return items.map(aEventoResumen);
  },
};

export default publicoService;
