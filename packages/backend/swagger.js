import path from "node:path";
import { fileURLToPath } from "node:url";
import swaggerJsdoc from "swagger-jsdoc";

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
      schemas: {
        Error: {
          type: "object",
          properties: {
            status: { type: "string", example: "fail" },
            message: { type: "string", example: "Ruta /api/inexistente no encontrada" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
  },
  // Ruta absoluta: así funciona igual si el proceso se lanza desde la raíz del monorepo.
  apis: [path.join(directorio, "routes", "*.js").replace(/\\/g, "/")],
};

export const swaggerSpec = swaggerJsdoc(options);
