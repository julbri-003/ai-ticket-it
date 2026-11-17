import { Router } from "express";
import { CategoriasController } from "../controllers/CategoriasController.js";
import { categoriasService } from "../dependencias.js";

const categoriasController = new CategoriasController(categoriasService);
const categoriasRouter = Router();

/**
 * @swagger
 * /api/categorias:
 *   get:
 *     summary: Listar las categorías de eventos
 *     tags: [Categorías]
 *     responses:
 *       200:
 *         description: Categorías ordenadas por nombre
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/Categoria" }
 */
categoriasRouter.get("/", (req, res) => categoriasController.listar(req, res));

export default categoriasRouter;
