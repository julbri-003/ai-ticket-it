/** Minúsculas y sin acentos: "Teatro Colón" → "teatro colon". Base de la búsqueda por texto. */
export function normalizarTexto(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Escapa los caracteres especiales para usar un texto del usuario dentro de una RegExp. */
export function escaparRegex(texto = "") {
  return String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
