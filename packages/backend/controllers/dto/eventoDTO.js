import { urlAbsoluta } from "./urls.js";
import { organizadorToDTO } from "./usuarioDTO.js";

export function multimediaToDTO(item, baseUrl) {
  return { url: urlAbsoluta(item.ruta, baseUrl), ruta: item.ruta, tipo: item.tipo, alt: item.alt };
}

function tipoEntradaToDTO(tipo) {
  return {
    id: tipo.id,
    nombre: tipo.nombre,
    descripcion: tipo.descripcion,
    precio: tipo.precio,
    cupo: tipo.cupo,
    disponibles: tipo.disponibles,
    vendidas: tipo.vendidas,
    agotado: tipo.disponibles === 0,
  };
}

/**
 * Evento para la API. `contexto` aporta lo que no es del evento:
 *   { reloj, baseUrl, categoria, organizador, esFavorito (solo con sesión de comprador) }
 */
export function eventoToDTO(
  evento,
  { reloj, baseUrl = "", categoria, organizador, esFavorito } = {},
) {
  const imagen = evento.imagenPrincipal;
  const dto = {
    id: evento.id,
    nombre: evento.nombre,
    descripcion: evento.descripcion,
    ampliacionesDescripcion: evento.ampliacionesDescripcion.map(({ texto, fecha }) => ({
      texto,
      fecha,
    })),
    categoria: categoria
      ? { id: categoria.id, nombre: categoria.nombre }
      : { id: evento.categoriaId },
    fecha: evento.fecha,
    lugar: evento.lugar,
    tiposEntrada: evento.tiposEntrada.map(tipoEntradaToDTO),
    multimedia: evento.multimedia.map((m) => multimediaToDTO(m, baseUrl)),
    imagen: imagen ? multimediaToDTO(imagen, baseUrl) : null,
    precioMinimo: evento.precioMinimo,
    agotado: evento.tiposEntrada.every((t) => t.disponibles === 0),
    yaOcurrio: evento.yaOcurrio(reloj),
    finalizado: !evento.activo,
    organizador: organizadorToDTO(organizador) ?? { id: evento.organizadorId },
  };
  if (esFavorito !== undefined) dto.esFavorito = esFavorito;
  return dto;
}
