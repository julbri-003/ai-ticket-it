import mongoose from "mongoose";

const { ObjectId } = mongoose.Types;

/** true si el valor puede usarse como _id de Mongo (ObjectId o string de 24 hex). */
export function esIdValido(valor) {
  if (valor instanceof ObjectId) return true;
  return typeof valor === "string" && /^[0-9a-fA-F]{24}$/.test(valor);
}

/** Convierte un id del dominio (string) a ObjectId. null/undefined se mantienen. */
export function aObjectId(valor) {
  if (valor == null) return valor;
  if (valor instanceof ObjectId) return valor;
  const id = typeof valor === "object" ? (valor.id ?? valor._id) : valor;
  return id instanceof ObjectId ? id : new ObjectId(String(id));
}

/** Convierte un ObjectId (o lo que venga de la base) al id string del dominio. */
export function aIdDominio(valor) {
  return valor == null ? valor : String(valor);
}

export function nuevoId() {
  return new ObjectId().toHexString();
}

/** Documento de mongoose o resultado de aggregate → objeto plano. */
export function plano(doc) {
  return typeof doc?.toObject === "function" ? doc.toObject() : doc;
}

/** Normaliza parámetros de paginación. */
export function paginacion({ pagina = 1, limite = 10 } = {}, maximo = 50) {
  const p = Math.max(1, Number.parseInt(pagina, 10) || 1);
  const l = Math.min(maximo, Math.max(1, Number.parseInt(limite, 10) || 10));
  return { pagina: p, limite: l, saltear: (p - 1) * l };
}

export const esDuplicado = (error) => error?.code === 11000;
