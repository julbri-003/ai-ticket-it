import { NotFoundError } from "../errors/AppError.js";

// Se llama a next una sola vez (REPO_REF lo llamaba dos veces).
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Ruta ${req.originalUrl} no encontrada`));
}
