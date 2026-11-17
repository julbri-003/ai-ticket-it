import { AppError } from "../errors/AppError.js";

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

  if (err.name === "CastError") {
    return res.status(400).json({
      status: "fail",
      message: "ID inválido",
      timestamp: new Date().toISOString(),
    });
  }

  // JSON mal formado en el body (lo lanza express.json()).
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      status: "fail",
      message: "El cuerpo de la petición no es un JSON válido",
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(500).json({
    status: "error",
    message: "Error interno del servidor",
    timestamp: new Date().toISOString(),
  });
}
