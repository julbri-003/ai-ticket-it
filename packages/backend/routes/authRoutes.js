import { Router } from "express";
import { AuthController } from "../controllers/AuthController.js";
import { authService } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const authController = new AuthController(authService);
const authRouter = Router();

/**
 * @swagger
 * /api/auth/registro:
 *   post:
 *     summary: Registrarse como comprador u organizador
 *     description: El rol se elige al registrarse y no se puede combinar. El email se normaliza a minúsculas.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, apellido, email, password, rol]
 *             additionalProperties: false
 *             properties:
 *               nombre: { type: string, example: "Ana" }
 *               apellido: { type: string, example: "Gómez" }
 *               email: { type: string, example: "ana.nueva@ticketit.test" }
 *               password: { type: string, minLength: 8, example: "Ticket123!" }
 *               rol: { type: string, enum: [COMPRADOR, ORGANIZADOR], example: "COMPRADOR" }
 *     responses:
 *       201:
 *         description: Usuario creado con su sesión
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Sesion" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       409:
 *         description: Ya existe un usuario con ese email
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "Ya existe un usuario registrado con ese email", timestamp: "2026-11-20T15:00:00.000Z" }
 */
authRouter.post("/registro", (req, res) => authController.registrar(req, res));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             additionalProperties: false
 *             properties:
 *               email: { type: string, example: "ana@ticketit.test" }
 *               password: { type: string, example: "Ticket123!" }
 *     responses:
 *       200:
 *         description: Sesión iniciada. El JWT lleva { id, rol, nombre }.
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Sesion" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401:
 *         description: Email o contraseña incorrectos
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Error" }
 *             example: { status: "fail", message: "Credenciales inválidas", timestamp: "2026-11-20T15:00:00.000Z" }
 */
authRouter.post("/login", (req, res) => authController.login(req, res));

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Usuario de la sesión actual
 *     tags: [Autenticación]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Usuario actual (sin datos sensibles)
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Usuario" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 */
authRouter.get("/me", authMiddleware, (req, res) => authController.me(req, res));

export default authRouter;
