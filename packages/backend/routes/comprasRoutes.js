import { Router } from "express";
import { ComprasController } from "../controllers/ComprasController.js";
import { Roles } from "../domain/rolesDominio.js";
import { MensajesController } from "../controllers/MensajesController.js";
import { comprasService, mensajesService, reloj } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

const comprasController = new ComprasController({ comprasService, reloj });
const soloComprador = [authMiddleware, authorizeRole(Roles.COMPRADOR)];
const soloOrganizador = [authMiddleware, authorizeRole(Roles.ORGANIZADOR)];

export const comprasRouter = Router();

/**
 * @swagger
 * components:
 *   parameters:
 *     CompraId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, example: "6740a1f2c3d4e5f6a7b8c9e1" }
 *       description: Id de la compra
 *     FiltroEstadoCompra:
 *       in: query
 *       name: estado
 *       schema: { type: string, enum: [PENDIENTE, CONFIRMADA, UTILIZADA, CANCELADA, REEMBOLSADA] }
 */

/**
 * @swagger
 * /api/compras:
 *   post:
 *     summary: Comprar entradas (queda PENDIENTE de pago)
 *     description: |
 *       El precio sale del evento, nunca del body. Reserva el cupo de forma atómica (sin sobreventa).
 *       La compra vence a las 48 h, o a la hora del evento si ocurre antes.
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventoId, tipoEntradaId, cantidad]
 *             additionalProperties: false
 *             properties:
 *               eventoId: { type: string, example: "6740a1f2c3d4e5f6a7b8c9d0" }
 *               tipoEntradaId: { type: string, example: "6740a1f2c3d4e5f6a7b8c9d5" }
 *               cantidad: { type: integer, minimum: 1, maximum: 10, example: 2 }
 *     responses:
 *       201:
 *         description: Compra creada en PENDIENTE
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/CompraDetalle" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409:
 *         description: No hay cupo suficiente
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "No hay cupo suficiente", timestamp: "2026-11-20T15:00:00.000Z" }
 */
comprasRouter.post("/", ...soloComprador, (req, res) => comprasController.crear(req, res));

/**
 * @swagger
 * /api/compras/mias:
 *   get:
 *     summary: Mis compras (comprador)
 *     description: Próximas primero (por fecha del evento) y después las de eventos pasados.
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/FiltroEstadoCompra" }]
 *     responses:
 *       200:
 *         description: Compras con sus acciones disponibles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/CompraResumen" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
comprasRouter.get("/mias", ...soloComprador, (req, res) => comprasController.mias(req, res));

const mensajesController = new MensajesController({ mensajesService });

/**
 * @swagger
 * /api/compras/conversaciones:
 *   get:
 *     summary: Bandeja de mensajes (comprador u organizador)
 *     description: >
 *       Compras del usuario, como comprador u organizador, con al menos un mensaje, de la
 *       conversación más reciente a la más vieja. Incluye el último mensaje, los no leídos de
 *       cada una y el total de no leídos de todas (para el ícono de mensajería).
 *     tags: [Chat]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/Pagina" }
 *       - { $ref: "#/components/parameters/Limite" }
 *     responses:
 *       200:
 *         description: Conversaciones paginadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       compraId: { type: string }
 *                       estado: { type: string, example: CONFIRMADA }
 *                       tipoEntrada: { type: string, example: General }
 *                       cantidad: { type: integer, example: 2 }
 *                       evento:
 *                         type: object
 *                         properties:
 *                           id: { type: string }
 *                           nombre: { type: string }
 *                           fecha: { type: string, format: date-time }
 *                           imagen: { $ref: "#/components/schemas/Multimedia" }
 *                       otro:
 *                         type: object
 *                         properties:
 *                           nombre: { type: string, example: Lucía }
 *                           rol: { type: string, example: ORGANIZADOR }
 *                       ultimoMensaje: { $ref: "#/components/schemas/MensajeChat" }
 *                       mensajesNoLeidos: { type: integer, example: 1 }
 *                 total: { type: integer }
 *                 pagina: { type: integer }
 *                 limite: { type: integer }
 *                 totalNoLeidos: { type: integer, example: 3 }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
comprasRouter.get("/conversaciones", authMiddleware, (req, res) =>
  mensajesController.conversaciones(req, res),
);

/**
 * @swagger
 * /api/compras/{id}:
 *   get:
 *     summary: Detalle de una compra (comprador dueño u organizador del evento)
 *     description: Historial completo (timeline), mensajes, reseña y acciones disponibles para quien consulta.
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     responses:
 *       200:
 *         description: Detalle de la compra
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/CompraDetalle" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
comprasRouter.get("/:id", authMiddleware, (req, res) => comprasController.detalle(req, res));

/**
 * @swagger
 * /api/compras/{id}/pagar:
 *   post:
 *     summary: Pagar (simulado) una compra PENDIENTE → CONFIRMADA
 *     description: Sin body. Si ya venció, primero se vence y se responde 409 "La compra venció".
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     responses:
 *       200:
 *         description: Compra confirmada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/CompraDetalle" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409:
 *         description: Venció o el estado no permite pagar
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "La compra venció", timestamp: "2026-11-20T15:00:00.000Z" }
 */
comprasRouter.post("/:id/pagar", ...soloComprador, (req, res) => comprasController.pagar(req, res));

/**
 * @swagger
 * /api/compras/{id}/cancelar:
 *   post:
 *     summary: Cancelar una compra PENDIENTE o CONFIRMADA
 *     description: Libera el cupo. Si estaba CONFIRMADA queda un reembolso pendiente (24 h para el organizador).
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     responses:
 *       200:
 *         description: Compra cancelada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/CompraDetalle" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409:
 *         description: El evento ya ocurrió o el estado no permite cancelar
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "No se puede cancelar una compra UTILIZADA", timestamp: "2026-11-20T15:00:00.000Z" }
 */
comprasRouter.post("/:id/cancelar", ...soloComprador, (req, res) =>
  comprasController.cancelar(req, res),
);

/**
 * @swagger
 * /api/compras/{id}/reembolsar:
 *   post:
 *     summary: Reembolsar una compra cancelada (organizador del evento)
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     responses:
 *       200:
 *         description: Compra reembolsada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/CompraDetalle" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409:
 *         description: No tiene reembolso pendiente o ya se reembolsó automáticamente
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "La compra ya fue reembolsada automáticamente", timestamp: "2026-11-20T15:00:00.000Z" }
 */
comprasRouter.post("/:id/reembolsar", ...soloOrganizador, (req, res) =>
  comprasController.reembolsar(req, res),
);

/**
 * @swagger
 * /api/compras/{id}/resenia:
 *   post:
 *     summary: Reseñar una compra UTILIZADA (una vez por compra)
 *     description: Actualiza el puntaje promedio del organizador en la misma operación.
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/CompraId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [puntuacion]
 *             additionalProperties: false
 *             properties:
 *               puntuacion: { type: number, minimum: 1, maximum: 5, multipleOf: 0.5, example: 4.5 }
 *               detalle: { type: string, maxLength: 1000, example: "Muy buen sonido, el lugar un poco chico." }
 *     responses:
 *       201:
 *         description: Reseña creada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Resenia" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409:
 *         description: Ya tiene reseña o no está UTILIZADA
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "Esta compra ya tiene una reseña", timestamp: "2026-11-20T15:00:00.000Z" }
 */
comprasRouter.post("/:id/resenia", ...soloComprador, (req, res) =>
  comprasController.reseniar(req, res),
);

/** Montado en /api/eventos/:eventoId/compras. */
export const comprasDeEventoRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /api/eventos/{eventoId}/compras:
 *   get:
 *     summary: Compras de un evento con resumen de ocupación (organizador dueño)
 *     description: Por tipo de entrada `vendidas + disponibles = cupo`; conteo por estado, recaudación y reembolsos pendientes.
 *     tags: [Compras]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: eventoId
 *         required: true
 *         schema: { type: string, example: "6740a1f2c3d4e5f6a7b8c9d0" }
 *       - { $ref: "#/components/parameters/FiltroEstadoCompra" }
 *     responses:
 *       200:
 *         description: Resumen y compras (filtradas por estado si se indica)
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/ComprasDeEvento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
comprasDeEventoRouter.get("/", ...soloOrganizador, (req, res) =>
  comprasController.deEvento(req, res),
);
