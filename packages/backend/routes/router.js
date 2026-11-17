import express from "express";
import healthRouter from "./healthRoutes.js";
import authRouter from "./authRoutes.js";
import categoriasRouter from "./categoriasRoutes.js";
import eventosRouter from "./eventosRoutes.js";
import favoritosRouter from "./favoritosRoutes.js";
import { comprasDeEventoRouter, comprasRouter } from "./comprasRoutes.js";
import mensajesRouter from "./mensajesRoutes.js";
import notificacionesRouter from "./notificacionesRoutes.js";
import resumenPublicoRouter from "./resumenPublicoRoutes.js";

const router = express.Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/categorias", categoriasRouter);
router.use("/eventos/:eventoId/compras", comprasDeEventoRouter);
router.use("/eventos", eventosRouter);
router.use("/favoritos", favoritosRouter);
router.use("/compras/:id/mensajes", mensajesRouter);
router.use("/compras", comprasRouter);
router.use("/notificaciones", notificacionesRouter);
router.use("/resumen-publico", resumenPublicoRouter);

export default router;
