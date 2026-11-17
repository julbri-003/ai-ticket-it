import { publicoApi } from "./apis/publicoApi";

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
  };
}

export const publicoService = {
  async resumen() {
    const { estadisticas, reseniasDestacadas } = await publicoApi.resumen();
    return {
      estadisticas,
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
