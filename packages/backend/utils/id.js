/** Id de un objeto de dominio, un documento de Mongo o el id pelado. */
export function idDe(valor) {
  if (valor == null || typeof valor !== "object") return valor;
  if (typeof valor.toHexString === "function") return valor.toHexString();
  const id = valor.id ?? valor._id;
  return id != null && typeof id === "object" ? String(id) : id;
}

/** Compara dos referencias aunque una sea objeto y la otra el id. */
export function mismoId(izquierda, derecha) {
  const idIzquierda = idDe(izquierda);
  const idDerecha = idDe(derecha);
  if (idIzquierda == null || idDerecha == null) return false;
  return String(idIzquierda) === String(idDerecha);
}
