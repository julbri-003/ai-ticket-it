import { Router } from "express";
import { EventosController } from "../controllers/EventosController.js";
import { Roles } from "../domain/rolesDominio.js";
import { eventosService, recomendacionesService, reloj, reseniasService } from "../dependencias.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { authOpcionalMiddleware } from "../middlewares/authOpcionalMiddleware.js";
import { authorizeRole } from "../middlewares/authorizeRole.js";
import { uploadMultimedia } from "../middlewares/uploadMiddleware.js";

const eventosController = new EventosController({
  eventosService,
  recomendacionesService,
  reseniasService,
  reloj,
});
const eventosRouter = Router();
const soloOrganizador = [authMiddleware, authorizeRole(Roles.ORGANIZADOR)];

/**
 * @swagger
 * components:
 *   parameters:
 *     EventoId:
 *       in: path
 *       name: id
 *       required: true
 *       schema: { type: string, example: "6740a1f2c3d4e5f6a7b8c9d0" }
 *       description: Id del evento
 *     Pagina:
 *       in: query
 *       name: pagina
 *       schema: { type: integer, minimum: 1, default: 1 }
 *     Limite:
 *       in: query
 *       name: limite
 *       schema: { type: integer, minimum: 1, maximum: 50, default: 10 }
 */

/**
 * @swagger
 * /api/eventos:
 *   get:
 *     summary: Buscador de eventos con filtros combinables
 *     description: |
 *       Público. Con sesión de comprador cada evento incluye `esFavorito`, y `paraVos=true` reemplaza
 *       las categorías por las preferidas según sus favoritos (o su intersección con `categoriaIds`).
 *       Si no aplica, `paraVos` se ignora y `filtrosAplicados.paraVos` es `false`.
 *     tags: [Eventos]
 *     security: [{}, { bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: q, schema: { type: string }, example: "jazz", description: "Texto en nombre, descripción, lugar y organizador; sin mayúsculas ni acentos" }
 *       - { in: query, name: categoriaIds, schema: { type: string }, example: "6740a1f2c3d4e5f6a7b8c9d0,6740a1f2c3d4e5f6a7b8c9d1", description: "Ids separados por coma" }
 *       - { in: query, name: precioMin, schema: { type: number }, example: 10000, description: "Algún tipo de entrada con precio ≥ precioMin" }
 *       - { in: query, name: precioMax, schema: { type: number }, example: 30000 }
 *       - { in: query, name: fechaDesde, schema: { type: string }, example: "2026-12-01" }
 *       - { in: query, name: fechaHasta, schema: { type: string }, example: "2026-12-31", description: "Con solo fecha incluye todo ese día" }
 *       - { in: query, name: conDisponibilidad, schema: { type: string, enum: ["true", "false"] }, example: "true" }
 *       - { in: query, name: puntajeMin, schema: { type: number, minimum: 0, maximum: 5 }, example: 4, description: "Puntaje promedio mínimo del organizador" }
 *       - { in: query, name: paraVos, schema: { type: string, enum: ["true", "false"] }, example: "true" }
 *       - { in: query, name: orden, schema: { type: string, enum: [fecha, precio, puntaje, relevancia], default: fecha }, description: "relevancia solo con paraVos=true" }
 *       - { in: query, name: direccion, schema: { type: string, enum: [asc, desc] }, description: "Por defecto asc (fecha y precio), desc (puntaje, relevancia y anteriores)" }
 *       - { $ref: "#/components/parameters/Pagina" }
 *       - { $ref: "#/components/parameters/Limite" }
 *       - { in: query, name: anteriores, schema: { type: string, enum: ["true", "false"], default: "false" }, description: "true = eventos ya ocurridos o finalizados" }
 *     responses:
 *       200:
 *         description: Página de eventos
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginaEventos" }
 *       400: { $ref: "#/components/responses/Validacion" }
 */
eventosRouter.get("/", authOpcionalMiddleware, (req, res) => eventosController.buscar(req, res));

/**
 * @swagger
 * /api/eventos/recomendados:
 *   get:
 *     summary: Recomendados para vos
 *     description: |
 *       Eventos activos y futuros de las categorías preferidas según los favoritos del comprador,
 *       excluyendo los que ya son favoritos y los que ya compró (CONFIRMADA/PENDIENTE). Ordenados por
 *       peso de la categoría y fecha. Sin favoritos responde `sinFavoritos: true` (no es error).
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { $ref: "#/components/parameters/Pagina" }
 *       - { $ref: "#/components/parameters/Limite" }
 *     responses:
 *       200:
 *         description: Recomendaciones
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Recomendados" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
eventosRouter.get("/recomendados", authMiddleware, authorizeRole(Roles.COMPRADOR), (req, res) =>
  eventosController.recomendados(req, res),
);

/**
 * @swagger
 * /api/eventos/mios:
 *   get:
 *     summary: Mis eventos (organizador), activos y anteriores
 *     description: Con vendidas/disponibles por tipo de entrada y conteo de compras por estado.
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Eventos del organizador, del más reciente al más antiguo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: "#/components/schemas/EventoMio" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
eventosRouter.get("/mios", ...soloOrganizador, (req, res) => eventosController.mios(req, res));

/**
 * @swagger
 * /api/eventos/{id}:
 *   get:
 *     summary: Detalle de un evento (también de los finalizados)
 *     tags: [Eventos]
 *     security: [{}, { bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     responses:
 *       200:
 *         description: Evento con tipos de entrada, organizador, multimedia (URLs absolutas) y ampliaciones
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
eventosRouter.get("/:id", authOpcionalMiddleware, (req, res) =>
  eventosController.detalle(req, res),
);

/**
 * @swagger
 * /api/eventos/{id}/resenias:
 *   get:
 *     summary: Reseñas de todos los eventos del organizador de este evento
 *     tags: [Eventos]
 *     parameters:
 *       - { $ref: "#/components/parameters/EventoId" }
 *       - { $ref: "#/components/parameters/Pagina" }
 *       - { $ref: "#/components/parameters/Limite" }
 *     responses:
 *       200:
 *         description: Reseñas paginadas, de la más nueva a la más vieja, con el evento de cada una
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/PaginaResenias" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 */
eventosRouter.get("/:id/resenias", (req, res) => eventosController.resenias(req, res));

/**
 * @swagger
 * /api/eventos:
 *   post:
 *     summary: Crear un evento (organizador)
 *     description: La fecha debe ser futura y debe haber al menos un tipo de entrada. La multimedia se sube aparte.
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/EventoInput" }
 *           example:
 *             nombre: "Noche de Jazz en el Sótano"
 *             descripcion: "Un cuarteto de jazz presenta standards y temas propios."
 *             categoriaId: "6740a1f2c3d4e5f6a7b8c9d0"
 *             fecha: "2026-12-20T23:00:00-03:00"
 *             lugar: "Club del Sótano, San Telmo, CABA"
 *             tiposEntrada:
 *               - { nombre: "General", precio: 18000, cupo: 120 }
 *               - { nombre: "VIP", descripcion: "Mesa cerca del escenario", precio: 42000, cupo: 20 }
 *     responses:
 *       201:
 *         description: Evento creado
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 */
eventosRouter.post("/", ...soloOrganizador, (req, res) => eventosController.crear(req, res));

/**
 * @swagger
 * /api/eventos/{id}/multimedia:
 *   post:
 *     summary: Subir imágenes o videos del evento (organizador dueño)
 *     description: |
 *       Hasta 6 archivos en el campo `archivos`: JPG, PNG o WEBP (≤ 5 MB) y MP4 (≤ 20 MB).
 *       Por cada archivo, un campo `alts` en el mismo orden (obligatorio para imágenes y videos).
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [archivos]
 *             properties:
 *               archivos:
 *                 type: array
 *                 items: { type: string, format: binary }
 *               alts:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Escenario con luces rojas y el público de pie"]
 *     responses:
 *       201:
 *         description: Evento con la multimedia actualizada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409: { $ref: "#/components/responses/Conflicto" }
 *   delete:
 *     summary: Quitar un archivo multimedia del evento (organizador dueño)
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ruta]
 *             additionalProperties: false
 *             properties:
 *               ruta: { type: string, example: "/uploads/eventos/3f1c9a.png" }
 *     responses:
 *       200:
 *         description: Evento sin ese archivo
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409: { $ref: "#/components/responses/Conflicto" }
 */
eventosRouter.post("/:id/multimedia", ...soloOrganizador, uploadMultimedia, (req, res) =>
  eventosController.agregarMultimedia(req, res),
);
eventosRouter.delete("/:id/multimedia", ...soloOrganizador, (req, res) =>
  eventosController.quitarMultimedia(req, res),
);

/**
 * @swagger
 * /api/eventos/{id}/tipos-entrada:
 *   post:
 *     summary: Agregar un tipo de entrada (organizador dueño)
 *     description: Los tipos existentes nunca se modifican ni se borran; solo se agregan nuevos.
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TipoEntradaInput" }
 *     responses:
 *       201:
 *         description: Evento con el nuevo tipo de entrada
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409: { $ref: "#/components/responses/Conflicto" }
 */
eventosRouter.post("/:id/tipos-entrada", ...soloOrganizador, (req, res) =>
  eventosController.agregarTipoEntrada(req, res),
);

/**
 * @swagger
 * /api/eventos/{id}/ampliaciones:
 *   post:
 *     summary: Ampliar la descripción (organizador dueño)
 *     description: La descripción original no se edita; se agrega una ampliación con fecha.
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [texto]
 *             additionalProperties: false
 *             properties:
 *               texto: { type: string, example: "Se suma una charla con el elenco al terminar la función." }
 *     responses:
 *       201:
 *         description: Evento con la nueva ampliación
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Evento" }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409: { $ref: "#/components/responses/Conflicto" }
 */
eventosRouter.post("/:id/ampliaciones", ...soloOrganizador, (req, res) =>
  eventosController.ampliarDescripcion(req, res),
);

/**
 * @swagger
 * /api/eventos/{id}/cancelar:
 *   post:
 *     summary: Cancelar el evento (organizador dueño)
 *     description: >
 *       Motivo obligatorio. Solo antes de que ocurra. Todas las compras se cancelan; las pagas
 *       (y las canceladas con reembolso pendiente) se reembolsan automáticamente. El evento deja
 *       de aparecer en el buscador y ya no se puede editar ni comprar.
 *     tags: [Eventos]
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ $ref: "#/components/parameters/EventoId" }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [motivo]
 *             additionalProperties: false
 *             properties:
 *               motivo: { type: string, maxLength: 500, example: "La sala suspendió la función por obras." }
 *     responses:
 *       200:
 *         description: Evento cancelado y cantidad de compras resueltas
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - { $ref: "#/components/schemas/Evento" }
 *                 - type: object
 *                   properties:
 *                     comprasResueltas: { type: integer, example: 3 }
 *       400: { $ref: "#/components/responses/Validacion" }
 *       401: { $ref: "#/components/responses/NoAutenticado" }
 *       403: { $ref: "#/components/responses/SinPermiso" }
 *       404: { $ref: "#/components/responses/NoEncontrado" }
 *       409: { $ref: "#/components/responses/Conflicto" }
 */
eventosRouter.post("/:id/cancelar", ...soloOrganizador, (req, res) =>
  eventosController.cancelar(req, res),
);

export default eventosRouter;
