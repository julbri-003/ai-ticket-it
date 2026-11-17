import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";
import { LIMITES_UPLOAD } from "./uploadMiddleware.js";

const MB = 1024 * 1024;

// Mensajes en castellano para los errores de multer.
const MENSAJES_MULTER = {
  LIMIT_FILE_SIZE: `El archivo supera el tamaño máximo (imágenes ${LIMITES_UPLOAD.imagen / MB} MB, videos ${LIMITES_UPLOAD.video / MB} MB)`,
  LIMIT_FILE_COUNT: `Se pueden subir como máximo ${LIMITES_UPLOAD.archivos} archivos por vez`,
  LIMIT_UNEXPECTED_FILE: 'Los archivos deben enviarse en el campo "archivos"',
  LIMIT_FIELD_COUNT: "La petición tiene demasiados campos",
  LIMIT_PART_COUNT: "La petición tiene demasiadas partes",
};

function respuesta(res, status, message, extra = {}) {
  return res.status(status).json({
    status: status >= 500 ? "error" : "fail",
    message,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      timestamp: err.timestamp,
    });
  }

  // Validación de zod: 400 con el detalle de cada campo.
  if (err instanceof ZodError) {
    const detalles = err.issues.map((issue) => ({
      campo: issue.path.join("."),
      mensaje: issue.message,
    }));
    const message =
      detalles.length === 1 && !detalles[0].campo
        ? detalles[0].mensaje
        : `Datos inválidos: ${detalles.map((d) => (d.campo ? `${d.campo}: ${d.mensaje}` : d.mensaje)).join("; ")}`;
    return respuesta(res, 400, message, { detalles });
  }

  if (err instanceof multer.MulterError) {
    return respuesta(
      res,
      400,
      MENSAJES_MULTER[err.code] ?? "No se pudo procesar el archivo subido",
    );
  }

  if (err.name === "CastError") {
    return respuesta(res, 400, "ID inválido");
  }

  // JSON mal formado en el body (lo lanza express.json()).
  if (err.type === "entity.parse.failed") {
    return respuesta(res, 400, "El cuerpo de la petición no es un JSON válido");
  }

  return respuesta(res, 500, "Error interno del servidor");
}
