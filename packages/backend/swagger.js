import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";
import { esquemas } from "./docs/swaggerEsquemas.js";

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
