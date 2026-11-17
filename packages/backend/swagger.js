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

// Chat: REST para enviar y leer; socket.io solo para empujar (descripción del tag "Chat").
const DESCRIPCION_CHAT = [
  "Chat entre el comprador y el organizador de cada compra, en cualquier estado.",
  "**Los mensajes se envían por REST** (pasan por validación, permisos y dominio); el socket solo empuja.",
  "Si el socket se cae, el front hace polling con `GET /api/compras/{id}/mensajes?desde=<ISO>`.",
  "",
  "### Socket.io (mismo host y puerto que la API)",
  '- **Conexión**: `io(URL, { auth: { token: "<JWT>" } })`. Sin token o con uno inválido se rechaza con `No autorizado`.',
  "- Al conectar, el socket entra a la sala `usuario:<id>`.",
  "",
  "| Dirección | Evento | Payload | Descripción |",
  "|---|---|---|---|",
  "| cliente → server | `compra:unirse` | `{ compraId }` + ack | Entra a la sala `compra:<id>` si es participante. Ack `{ ok: true }` o `{ error }`. |",
  "| cliente → server | `compra:salir` | `{ compraId }` + ack | Sale de la sala de la compra. |",
  "| server → sala `compra:<id>` | `mensaje:nuevo` | `{ compraId, mensaje }` | Nuevo mensaje del chat (después de un POST REST). |",
  "| server → `usuario:<id>` | `compra:estado` | `{ compraId, estado, cambio }` | Cada transición de la compra, al comprador y al organizador. |",
  "| server → `usuario:<id>` | `notificacion:nueva` | Notificacion | Notificación in-app nueva. |",
  "",
  "Mientras un participante está en la sala de la compra no recibe la notificación NUEVO_MENSAJE (ya lo ve en el chat).",
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
      { name: "Chat", description: DESCRIPCION_CHAT },
      {
        name: "Notificaciones",
        description:
          "Notificaciones in-app. Cada una nueva también llega en tiempo real por el evento de socket `notificacion:nueva` (ver tag Chat).",
      },
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
