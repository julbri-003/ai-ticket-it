import { Router } from "express";
import { reseniaToDTO } from "../controllers/dto/reseniaDTO.js";
import { resumenPublicoService } from "../dependencias.js";

const resumenPublicoRouter = Router();

/**
 * @swagger
 * /api/resumen-publico:
 *   get:
 *     summary: Estadísticas y reseñas destacadas para la landing (público)
 *     tags: [Eventos]
 *     responses:
 *       200:
 *         description: Resumen público
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 estadisticas:
 *                   type: object
 *                   properties:
 *                     eventosActivos: { type: integer, example: 13 }
 *                     entradasVendidas: { type: integer, example: 31 }
 *                     organizadores: { type: integer, example: 3 }
 *                     puntajePromedio: { type: number, nullable: true, example: 4.5 }
 *                     cantidadResenias: { type: integer, example: 3 }
 *                 eventosPorCategoria:
 *                   type: object
 *                   description: Eventos a la venta por id de categoría (sin las que no tienen)
 *                   additionalProperties: { type: integer }
 *                   example: { "665f1c2a9b1e8a0012345678": 4 }
 *                 reseniasDestacadas:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Resenia" }
 */
resumenPublicoRouter.get("/", async (req, res) => {
  const { estadisticas, eventosPorCategoria, reseniasDestacadas } =
    await resumenPublicoService.obtener();
  res.json({
    estadisticas,
    eventosPorCategoria,
    reseniasDestacadas: reseniasDestacadas.map(({ resenia, evento }) =>
      reseniaToDTO(resenia, { evento }),
    ),
  });
});

export default resumenPublicoRouter;
