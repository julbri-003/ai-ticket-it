import express from "express";
import healthRouter from "./healthRoutes.js";
import authRouter from "./authRoutes.js";
import categoriasRouter from "./categoriasRoutes.js";
import eventosRouter from "./eventosRoutes.js";
import favoritosRouter from "./favoritosRoutes.js";
import { comprasDeEventoRouter, comprasRouter } from "./comprasRoutes.js";

const router = express.Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/categorias", categoriasRouter);
router.use("/eventos/:eventoId/compras", comprasDeEventoRouter);
router.use("/eventos", eventosRouter);
router.use("/favoritos", favoritosRouter);
router.use("/compras", comprasRouter);

export default router;
