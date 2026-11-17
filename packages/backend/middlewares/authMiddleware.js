import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../errors/AppError.js";

// 401: la petición no está autenticada (falta el token o es inválido/expiró).
// Los errores de permisos (rol o titularidad) se responden con 403 en otras capas.
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token no proporcionado");
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, rol, ... }
    next();
  } catch {
    throw new UnauthorizedError("Token inválido o expirado");
  }
}
