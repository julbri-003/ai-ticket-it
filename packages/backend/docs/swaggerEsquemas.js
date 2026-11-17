// Esquemas OpenAPI compartidos (components.schemas). Los endpoints están en routes/*.js.

const ID = { type: "string", example: "6740a1f2c3d4e5f6a7b8c9d0" };
const FECHA = { type: "string", format: "date-time", example: "2026-12-05T23:00:00.000Z" };

export const esquemas = {
  Error: {
    type: "object",
    properties: {
      status: { type: "string", example: "fail" },
      message: { type: "string", example: "Ruta /api/inexistente no encontrada" },
      timestamp: FECHA,
    },
  },
  ErrorValidacion: {
    type: "object",
    properties: {
      status: { type: "string", example: "fail" },
      message: {
        type: "string",
        example: "Datos inválidos: password: La contraseña debe tener al menos 8 caracteres",
      },
      timestamp: FECHA,
      detalles: {
        type: "array",
        items: {
          type: "object",
          properties: {
            campo: { type: "string", example: "password" },
            mensaje: { type: "string", example: "La contraseña debe tener al menos 8 caracteres" },
          },
        },
      },
    },
  },
  Usuario: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "Ana" },
      apellido: { type: "string", example: "Gómez" },
      email: { type: "string", example: "ana@ticketit.test" },
      rol: { type: "string", enum: ["COMPRADOR", "ORGANIZADOR"], example: "COMPRADOR" },
      puntajePromedio: { type: "number", example: 4.5, description: "Solo organizadores" },
      cantidadResenias: { type: "integer", example: 12, description: "Solo organizadores" },
    },
  },
  Sesion: {
    type: "object",
    properties: {
      token: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
      usuario: { $ref: "#/components/schemas/Usuario" },
    },
  },
  Categoria: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "Recitales" },
      descripcion: { type: "string", example: "Música en vivo: bandas, solistas y orquestas" },
    },
  },
  TipoEntrada: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "VIP" },
      descripcion: { type: "string", example: "Mesa cerca del escenario y una copa" },
      precio: { type: "number", example: 42000 },
      cupo: { type: "integer", example: 20 },
      disponibles: { type: "integer", example: 18 },
      vendidas: { type: "integer", example: 2 },
      agotado: { type: "boolean", example: false },
    },
  },
  TipoEntradaInput: {
    type: "object",
    required: ["nombre", "precio", "cupo"],
    additionalProperties: false,
    properties: {
      nombre: { type: "string", example: "Platea" },
      descripcion: { type: "string", example: "Filas 1 a 10" },
      precio: { type: "number", example: 30000 },
      cupo: { type: "integer", example: 80 },
    },
  },
  Multimedia: {
    type: "object",
    properties: {
      url: { type: "string", example: "http://192.168.0.10:8000/uploads/eventos/3f1c9a.png" },
      ruta: { type: "string", example: "/uploads/eventos/3f1c9a.png" },
      tipo: { type: "string", enum: ["imagen", "video"], example: "imagen" },
      alt: { type: "string", example: "Escenario con luces rojas y el público de pie" },
    },
  },
  Organizador: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "Lucía Ferrari" },
      puntajePromedio: { type: "number", example: 4.67 },
      cantidadResenias: { type: "integer", example: 3 },
    },
  },
  Evento: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "Noche de Jazz en el Sótano" },
      descripcion: {
        type: "string",
        example: "Un cuarteto de jazz presenta standards y temas propios.",
      },
      ampliacionesDescripcion: {
        type: "array",
        items: {
          type: "object",
          properties: { texto: { type: "string", example: "Se suma un invitado." }, fecha: FECHA },
        },
      },
      categoria: {
        type: "object",
        properties: { id: ID, nombre: { type: "string", example: "Recitales" } },
      },
      fecha: FECHA,
      lugar: { type: "string", example: "Club del Sótano, San Telmo, CABA" },
      tiposEntrada: { type: "array", items: { $ref: "#/components/schemas/TipoEntrada" } },
      multimedia: { type: "array", items: { $ref: "#/components/schemas/Multimedia" } },
      imagen: { $ref: "#/components/schemas/Multimedia" },
      precioMinimo: { type: "number", example: 18000 },
      agotado: { type: "boolean", example: false },
      yaOcurrio: { type: "boolean", example: false },
      finalizado: { type: "boolean", example: false },
      organizador: { $ref: "#/components/schemas/Organizador" },
      esFavorito: {
        type: "boolean",
        example: true,
        description: "Solo con sesión de comprador",
      },
    },
  },
  EventoInput: {
    type: "object",
    required: ["nombre", "descripcion", "categoriaId", "fecha", "lugar", "tiposEntrada"],
    additionalProperties: false,
    properties: {
      nombre: { type: "string", example: "Noche de Jazz en el Sótano" },
      descripcion: {
        type: "string",
        example: "Un cuarteto de jazz presenta standards y temas propios.",
      },
      categoriaId: ID,
      fecha: { type: "string", format: "date-time", example: "2026-12-20T23:00:00-03:00" },
      lugar: { type: "string", example: "Club del Sótano, San Telmo, CABA" },
      tiposEntrada: {
        type: "array",
        minItems: 1,
        items: { $ref: "#/components/schemas/TipoEntradaInput" },
      },
    },
  },
  PaginaEventos: {
    type: "object",
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/Evento" } },
      total: { type: "integer", example: 13 },
      pagina: { type: "integer", example: 1 },
      limite: { type: "integer", example: 10 },
      filtrosAplicados: {
        type: "object",
        example: {
          q: "jazz",
          orden: "precio",
          direccion: "asc",
          paraVos: false,
          anteriores: false,
          pagina: 1,
          limite: 10,
        },
      },
    },
  },
  Recomendados: {
    type: "object",
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/Evento" } },
      total: { type: "integer", example: 4 },
      pagina: { type: "integer", example: 1 },
      limite: { type: "integer", example: 10 },
      categorias: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: ID,
            nombre: { type: "string", example: "Recitales" },
            cantidad: { type: "integer", example: 4 },
          },
        },
      },
      motivo: {
        type: "string",
        nullable: true,
        example: "Porque guardaste eventos de Recitales y Festivales",
      },
      sinFavoritos: { type: "boolean", example: false },
    },
  },
  EventoMio: {
    allOf: [
      { $ref: "#/components/schemas/Evento" },
      {
        type: "object",
        properties: {
          comprasPorEstado: {
            type: "object",
            example: { PENDIENTE: 1, CONFIRMADA: 3, UTILIZADA: 0, CANCELADA: 1, REEMBOLSADA: 0 },
          },
        },
      },
    ],
  },
  Resenia: {
    type: "object",
    properties: {
      id: ID,
      compradorNombre: { type: "string", example: "Ana Gómez" },
      puntuacion: { type: "number", example: 4.5 },
      detalle: { type: "string", example: "Un sonido impecable y una sala hermosa." },
      fecha: FECHA,
      tipoEntradaNombre: { type: "string", example: "General" },
      evento: {
        type: "object",
        properties: { id: ID, nombre: { type: "string", example: "Recital Acústico de Otoño" } },
      },
    },
  },
  PaginaResenias: {
    type: "object",
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/Resenia" } },
      total: { type: "integer", example: 3 },
      pagina: { type: "integer", example: 1 },
      limite: { type: "integer", example: 10 },
      organizador: { $ref: "#/components/schemas/Organizador" },
    },
  },
  Favoritos: {
    type: "object",
    properties: { favoritos: { type: "array", items: ID } },
  },
};
