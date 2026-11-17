import { Router } from "express";
import { NotificacionesController } from "../controllers/NotificacionesController.js";
import { notificacionesService } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const notificacionesController = new NotificacionesController({ notificacionesService });
const notificacionesRouter = Router();
notificacionesRouter.use(authMiddleware);

/**
 * @swagger
 * /api/notificaciones:
 *   get:
 *     summary: Mis notificaciones, de la más nueva a la más vieja
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: soloNoLeidas, schema: { type: string, enum: ["true", "false"], default: "false" } }
 *       - { $ref: "#/components/parameters/Pagina" }
 *       - { $ref: "#/components/parameters/Limite" }
 *     responses:
 *       200:
 *         description: Página de notificaciones
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginaNotificaciones" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
notificacionesRouter.get("/", (req, res) => notificacionesController.listar(req, res));

/**
 * @swagger
 * /api/notificaciones/no-leidas/cantidad:
 *   get:
 *     summary: Cantidad de notificaciones sin leer (badge de la campanita)
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cantidad
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { cantidad: { type: integer, example: 3 } } }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
notificacionesRouter.get("/no-leidas/cantidad", (req, res) =>
  notificacionesController.cantidadNoLeidas(req, res),
);

/**
 * @swagger
 * /api/notificaciones/leidas:
 *   patch:
 *     summary: Marcar todas mis notificaciones como leídas
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cuántas se marcaron
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { actualizadas: { type: integer, example: 3 } } }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
notificacionesRouter.patch("/leidas", (req, res) =>
  notificacionesController.marcarTodasLeidas(req, res),
);

/**
 * @swagger
 * /api/notificaciones:
 *   delete:
 *     summary: Limpiar mis notificaciones (baja lógica)
 *     description: >
 *       Da de baja todas las notificaciones del usuario (activo = false, con fechaModificacion y
 *       modificadoPor). Dejan de listarse y de contarse; no se pueden recuperar desde la app.
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Cuántas se limpiaron
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { eliminadas: { type: integer, example: 5 } } }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
notificacionesRouter.delete("/", (req, res) => notificacionesController.limpiar(req, res));

/**
 * @swagger
 * /api/notificaciones/{id}/leida:
 *   patch:
 *     summary: Marcar una notificación como leída (solo el destinatario)
 *     tags: [Notificaciones]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, example: "6740a1f2c3d4e5f6a7b8c9f0" }
 *     responses:
 *       200:
 *         description: Notificación marcada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Notificacion" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
notificacionesRouter.patch("/:id/leida", (req, res) =>
  notificacionesController.marcarLeida(req, res),
);

export default notificacionesRouter;
