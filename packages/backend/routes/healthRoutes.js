import { Router } from "express";

const healthRouter = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verificar el estado de la API
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: API funcionando correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 */
healthRouter.get("/", (req, res) => {
  res.status(200).json({ status: "ok" });
});

export default healthRouter;
