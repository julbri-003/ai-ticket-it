import { BadRequestError } from "../errors/AppError.js";

// Validaciones comunes del dominio. Lanzan BadRequestError con un mensaje legible.

export function textoObligatorio(valor, mensaje) {
  if (typeof valor !== "string" || !valor.trim()) {
    throw new BadRequestError(mensaje);
  }
  return valor.trim();
}

export function textoOpcional(valor, { max, campo }) {
  if (valor == null) return "";
  if (typeof valor !== "string") {
    throw new BadRequestError(`${campo} debe ser un texto`);
  }
  const limpio = valor.trim();
  if (max !== undefined && limpio.length > max) {
    throw new BadRequestError(`${campo} admite como máximo ${max} caracteres`);
  }
  return limpio;
}

export function fechaValida(valor, mensaje) {
  const fecha = valor instanceof Date ? new Date(valor.getTime()) : new Date(valor);
  if (valor == null || Number.isNaN(fecha.getTime())) {
    throw new BadRequestError(mensaje);
  }
  return fecha;
}

export function idObligatorio(valor, mensaje) {
  if (valor == null || (typeof valor === "string" && !valor.trim())) {
    throw new BadRequestError(mensaje);
  }
  return valor;
}

export const PUNTUACION_MIN = 1;
export const PUNTUACION_MAX = 5;

/** Puntuación de una reseña: entre 1 y 5, en pasos de 0,5. */
export function validarPuntuacion(puntuacion) {
  const valida =
    typeof puntuacion === "number" &&
    Number.isFinite(puntuacion) &&
    puntuacion >= PUNTUACION_MIN &&
    puntuacion <= PUNTUACION_MAX &&
    Number.isInteger(puntuacion * 2);
  if (!valida) {
    throw new BadRequestError("La puntuación debe estar entre 1 y 5, en pasos de 0,5");
  }
  return puntuacion;
}
