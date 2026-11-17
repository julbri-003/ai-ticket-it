import { Router } from "express";
import { MensajesController } from "../controllers/MensajesController.js";
import { mensajesService } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const mensajesController = new MensajesController({ mensajesService });

/** Montado en /api/compras/:id/mensajes. Comprador dueño u organizador del evento. */
const mensajesRouter = Router({ mergeParams: true });
mensajesRouter.use(authMiddleware);

/**
 * @swagger
 * /api/compras/{id}/mensajes:
 *   get:
 *     summary: Mensajes del chat de una compra
 *     description: En orden de envío. Con `desde` devuelve solo los posteriores (polling de respaldo del socket).
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/CompraId" }
 *       - { in: query, name: desde, schema: { type: string, format: date-time }, example: "2026-11-20T15:00:00.000Z" }
 *     responses:
 *       200:
 *         description: Mensajes y cantidad de no leídos de quien consulta
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 mensajes:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/MensajeChat" }
 *                 mensajesNoLeidos: { type: integer, example: 1 }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *   post:
 *     summary: Enviar un mensaje (en cualquier estado de la compra)
 *     description: |
 *       Se guarda y se empuja `mensaje:nuevo` a la sala `compra:<id>`. Si el otro participante no está en
 *       la sala, recibe una notificación NUEVO_MENSAJE. Quien escribe queda con el chat leído.
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [mensaje]
 *             additionalProperties: false
 *             properties:
 *               mensaje: { type: string, minLength: 1, maxLength: 1000, example: "¿Hay estacionamiento cerca?" }
 *     responses:
 *       201:
 *         description: Mensaje creado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/MensajeChat" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
mensajesRouter.get("/", (req, res) => mensajesController.listar(req, res));
mensajesRouter.post("/", (req, res) => mensajesController.enviar(req, res));

/**
 * @swagger
 * /api/compras/{id}/mensajes/leidos:
 *   post:
 *     summary: Marcar como leídos los mensajes del otro participante
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     responses:
 *       200:
 *         description: Lectura registrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ultimaLectura: { type: string, format: date-time }
 *                 mensajesNoLeidos: { type: integer, example: 0 }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
mensajesRouter.post("/leidos", (req, res) => mensajesController.marcarLeidos(req, res));

export default mensajesRouter;
