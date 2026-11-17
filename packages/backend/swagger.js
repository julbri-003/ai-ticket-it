import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";
import { esquemas } from "./docs/swaggerEsquemas.js";

// Diagrama de estados de una compra (se muestra en la descripción del tag "Compras").
const DESCRIPCION_COMPRAS = [
  "Ciclo de vida de una compra. Cada transición queda en `historial` con quién, cuándo y el detalle.",
  "",
  "| Desde | Hacia | Disparador | Condición | Efecto |",
  "|---|---|---|---|---|",
  "| — | PENDIENTE | comprador crea la compra | evento activo y no ocurrido; hay cupo | reserva cupo; vence a las 48 h o a la hora del evento (lo que ocurra antes) |",
  "| PENDIENTE | CONFIRMADA | comprador `pagar` | antes de la fecha límite de pago | — |",
  "| PENDIENTE | CANCELADA | comprador `cancelar` | evento no ocurrido | libera cupo; sin reembolso |",
  "| PENDIENTE | CANCELADA (VENCIDA) | SISTEMA | llegó la fecha límite de pago | libera cupo |",
  "| CONFIRMADA | CANCELADA | comprador `cancelar` | evento no ocurrido | libera cupo; reembolso pendiente por 24 h |",
  "| CANCELADA | REEMBOLSADA | organizador `reembolsar` | reembolso pendiente | — |",
  "| CANCELADA | REEMBOLSADA | SISTEMA | pasaron 24 h sin que el organizador reembolse | reembolso automático |",
  "| CONFIRMADA | UTILIZADA | SISTEMA | llegó la fecha del evento | habilita la reseña |",
  "",
  "Cualquier otra transición responde **409**. Las transiciones del SISTEMA las aplica una tarea",
  "programada y, además, cada consulta u operación sobre una compra (evaluación perezosa).",
  "",
  "```",
  "             pagar                evento ocurrió",
  "PENDIENTE ──────────▶ CONFIRMADA ──────────────▶ UTILIZADA",
  "    │                      │",
  "    │ cancelar / vencer    │ cancelar",
  "    ▼                      ▼",
  "CANCELADA ◀────────────────┘ (con reembolso pendiente)",
  "    │ reembolsar (organizador, o automático a las 24 h)",
  "    ▼",
  "REEMBOLSADA",
  "```",
].join("\n");

const puerto = process.env.PORT || 8000;
const serverUrl = `http://localhost:${puerto}`;
const directorio = path.dirname(fileURLToPath(import.meta.url));

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API AI Ticket It",
      version: "1.0.0",
      description: "API para la venta de entradas para eventos",
    },
    servers: [{ url: serverUrl }],
    tags: [
      { name: "Autenticación" },
      { name: "Categorías" },
      { name: "Eventos" },
      { name: "Favoritos" },
      { name: "Compras", description: DESCRIPCION_COMPRAS },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: esquemas,
      responses: {
        Validacion: {
          description: "Datos inválidos (zod)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorValidacion" },
            },
          },
        },
        NoAutenticado: {
          description: "Falta el token o es inválido",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                status: "fail",
                message: "Token no proporcionado",
                timestamp: "2026-11-20T15:00:00.000Z",
              },
            },
          },
        },
        SinPermiso: {
          description: "No tiene permiso (rol o titularidad)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                status: "fail",
                message: "Solo el organizador del evento puede modificarlo",
                timestamp: "2026-11-20T15:00:00.000Z",
              },
            },
          },
        },
        NoEncontrado: {
          description: "No existe",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                status: "fail",
                message: "No existe el evento indicado",
                timestamp: "2026-11-20T15:00:00.000Z",
              },
            },
          },
        },
        Conflicto: {
          description: "Conflicto con el estado actual",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Error" },
              example: {
                status: "fail",
                message: "El evento ya ocurrió y no se puede editar",
                timestamp: "2026-11-20T15:00:00.000Z",
              },
            },
          },
        },
      },
    },
  },
  // Ruta absoluta: así funciona igual si el proceso se lanza desde la raíz del monorepo.
  apis: [path.join(directorio, "routes", "*.js").replace(/\\/g, "/")],
};

export const swaggerSpec = swaggerJsdoc(options);
