import { idDe } from "../utils/id.js";

/**
 * Categorías preferidas de un comprador según sus favoritos ("Recomendados para vos").
 *
 * @param eventosFavoritos eventos favoritos en el orden en que se marcaron (el último es
 *   el más reciente, igual que usuario.favoritos). Incluye eventos ya finalizados: reflejan
 *   a qué suele asistir.
 * @returns [{ categoriaId, cantidad, peso }] ordenado por cantidad desc; a igual cantidad,
 *   primero la categoría del favorito más reciente. peso = cantidad / totalFavoritos.
 */
export function categoriasPreferidas(eventosFavoritos = [], { maxCategorias = 3 } = {}) {
  const total = eventosFavoritos.length;
  if (total === 0) return [];

  const porCategoria = new Map();
  eventosFavoritos.forEach((evento, indice) => {
    const categoriaId = idDe(evento.categoriaId);
    const clave = String(categoriaId);
    const actual = porCategoria.get(clave) ?? { categoriaId, cantidad: 0, ultimoIndice: -1 };
    actual.cantidad += 1;
    actual.ultimoIndice = indice;
    porCategoria.set(clave, actual);
  });

  return [...porCategoria.values()]
    .sort((a, b) => b.cantidad - a.cantidad || b.ultimoIndice - a.ultimoIndice)
    .slice(0, maxCategorias)
    .map(({ categoriaId, cantidad }) => ({ categoriaId, cantidad, peso: cantidad / total }));
}

/** Peso de la categoría del evento entre las preferidas (0 si no está). */
export function puntajeRecomendacion(evento, preferidas) {
  const categoria = String(idDe(evento.categoriaId));
  return preferidas.find((p) => String(p.categoriaId) === categoria)?.peso ?? 0;
}

/** Ordena recomendados: primero mayor puntaje y, a igual puntaje, la fecha más próxima. */
export function ordenarRecomendados(eventos, preferidas) {
  return [...eventos].sort(
    (a, b) =>
      puntajeRecomendacion(b, preferidas) - puntajeRecomendacion(a, preferidas) ||
      new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
  );
}
