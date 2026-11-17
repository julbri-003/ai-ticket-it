import { Router } from "express";
import { FavoritosController } from "../controllers/FavoritosController.js";
import { Roles } from "../domain/rolesDominio.js";
import { favoritosService, reloj } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";

const favoritosController = new FavoritosController({ favoritosService, reloj });
const favoritosRouter = Router();

favoritosRouter.use(authMiddleware, authorizeRole(Roles.COMPRADOR));

/**
 * @swagger
 * components:
 *   parameters:
 *     EventoIdFavorito:
 *       in: path
 *       name: eventoId
 *       required: true
 *       schema: { type: string, example: "6740a1f2c3d4e5f6a7b8c9d0" }
 *       description: Id del evento
 */

/**
 * @swagger
 * /api/favoritos:
 *   get:
 *     summary: Mis eventos favoritos (incluso los que ya ocurrieron)
 *     description: Del último marcado al primero. Cada evento indica `yaOcurrio`.
 *     tags: [Favoritos]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Eventos favoritos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Evento" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
favoritosRouter.get("/", (req, res) => favoritosController.listar(req, res));

/**
 * @swagger
 * /api/favoritos/{eventoId}:
 *   put:
 *     summary: Marcar un evento como favorito (idempotente)
 *     tags: [Favoritos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoIdFavorito" }]
 *     responses:
 *       200:
 *         description: Lista de ids de favoritos
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Favoritos" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *   delete:
 *     summary: Quitar un evento de favoritos (idempotente)
 *     tags: [Favoritos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoIdFavorito" }]
 *     responses:
 *       200:
 *         description: Lista de ids de favoritos
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Favoritos" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
favoritosRouter.put("/:eventoId", (req, res) => favoritosController.agregar(req, res));
favoritosRouter.delete("/:eventoId", (req, res) => favoritosController.quitar(req, res));

export default favoritosRouter;
