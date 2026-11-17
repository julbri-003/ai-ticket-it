import jwt from "jsonwebtoken";

/**
 * Para endpoints públicos que se enriquecen con la sesión (p. ej. esFavorito en eventos).
 * Con un token válido completa req.user; sin token, o con uno inválido o vencido, sigue como
 * anónimo. No responde 401: una sesión vencida no debe romper la exploración pública.
 */
export function authOpcionalMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
    } catch {
      req.user = undefined;
    }
  }
  next();
}
