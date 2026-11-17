// Utilidades de texto para la UI.

/** Iniciales para un avatar: "Martín G." → "MG", "ana" → "A". */
export function iniciales(nombre = "") {
  const partes = (nombre ?? "")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)[0] : "")).toUpperCase();
}
