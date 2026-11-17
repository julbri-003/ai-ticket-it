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
      cancelado: { type: "boolean", example: false },
      cancelacion: {
        type: "object",
        nullable: true,
        properties: {
          motivo: { type: "string", example: "La sala suspendió la función por obras." },
          fecha: { type: "string", format: "date-time" },
        },
      },
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
          reembolsosPendientes: {
            type: "object",
            description: "Reembolsos por hacer todavía en plazo y el vencimiento más próximo",
            properties: {
              cantidad: { type: "integer", example: 2 },
              proximoVencimiento: { ...FECHA, nullable: true },
            },
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
  CambioEstado: {
    type: "object",
    properties: {
      estadoAnterior: { type: "string", nullable: true, example: "PENDIENTE" },
      estadoNuevo: { type: "string", example: "CONFIRMADA" },
      quien: {
        type: "object",
        properties: {
          id: ID,
          nombre: { type: "string", example: "Ana Gómez" },
          rol: {
            type: "string",
            enum: ["COMPRADOR", "ORGANIZADOR", "SISTEMA"],
            example: "COMPRADOR",
          },
        },
      },
      fechaHora: FECHA,
      detalle: { type: "string", example: "Pago confirmado por $84.000,00" },
    },
  },
  MensajeChat: {
    type: "object",
    properties: {
      id: ID,
      usuarioId: ID,
      usuarioNombre: { type: "string", example: "Lucía Ferrari" },
      rol: { type: "string", example: "ORGANIZADOR" },
      mensaje: { type: "string", example: "Hola Ana, sí: hay estacionamiento a media cuadra." },
      enviado: FECHA,
    },
  },
  EventoDeCompra: {
    type: "object",
    properties: {
      id: ID,
      nombre: { type: "string", example: "Noche de Jazz en el Sótano" },
      fecha: FECHA,
      lugar: { type: "string", example: "Club del Sótano, San Telmo, CABA" },
      imagen: { $ref: "#/components/schemas/Multimedia" },
      yaOcurrio: { type: "boolean", example: false },
    },
  },
  CompraResumen: {
    type: "object",
    properties: {
      id: ID,
      evento: { $ref: "#/components/schemas/EventoDeCompra" },
      tipoEntrada: {
        type: "object",
        properties: { id: ID, nombre: { type: "string", example: "VIP" } },
      },
      cantidad: { type: "integer", example: 2 },
      precioUnitario: { type: "number", example: 42000 },
      total: { type: "number", example: 84000 },
      estado: {
        type: "string",
        enum: ["PENDIENTE", "CONFIRMADA", "UTILIZADA", "CANCELADA", "REEMBOLSADA"],
        example: "CONFIRMADA",
      },
      motivoCancelacion: {
        type: "string",
        nullable: true,
        enum: ["CANCELADA_POR_COMPRADOR", "VENCIDA", "EVENTO_CANCELADO", null],
        example: null,
      },
      fechaCompra: FECHA,
      diasParaElEvento: {
        type: "integer",
        nullable: true,
        example: 5,
        description: "Solo CONFIRMADA (0 = el evento ya empezó)",
      },
      fechaLimitePago: { ...FECHA, nullable: true, description: "Solo PENDIENTE" },
      reembolsoPendiente: { type: "boolean", example: false },
      fechaLimiteReembolso: { ...FECHA, nullable: true },
      puedeCancelar: { type: "boolean", example: true },
      puedePagar: { type: "boolean", example: false },
      puedeReseniar: { type: "boolean", example: false },
      mensajesNoLeidos: { type: "integer", example: 1 },
    },
  },
  CompraDetalle: {
    type: "object",
    properties: {
      id: ID,
      evento: { $ref: "#/components/schemas/EventoDeCompra" },
      tipoEntrada: {
        type: "object",
        properties: { id: ID, nombre: { type: "string", example: "VIP" } },
      },
      cantidad: { type: "integer", example: 2 },
      precioUnitario: { type: "number", example: 42000 },
      total: { type: "number", example: 84000 },
      estado: { type: "string", example: "CONFIRMADA" },
      motivoCancelacion: { type: "string", nullable: true, example: null },
      fechaCompra: FECHA,
      diasParaElEvento: { type: "integer", nullable: true, example: 5 },
      fechaLimitePago: { ...FECHA, nullable: true },
      reembolsoPendiente: { type: "boolean", example: false },
      fechaLimiteReembolso: { ...FECHA, nullable: true },
      organizadorId: ID,
      historial: { type: "array", items: { $ref: "#/components/schemas/CambioEstado" } },
      mensajes: { type: "array", items: { $ref: "#/components/schemas/MensajeChat" } },
      mensajesNoLeidos: { type: "integer", example: 0 },
      resenia: { allOf: [{ $ref: "#/components/schemas/Resenia" }], nullable: true },
      acciones: {
        type: "object",
        description: "Lo que puede hacer quien consulta (comprador u organizador)",
        properties: {
          puedePagar: { type: "boolean", example: false },
          puedeCancelar: { type: "boolean", example: true },
          puedeReseniar: { type: "boolean", example: false },
          puedeReembolsar: { type: "boolean", example: false },
        },
      },
    },
  },
  ComprasDeEvento: {
    type: "object",
    properties: {
      evento: {
        type: "object",
        properties: {
          id: ID,
          nombre: { type: "string", example: "Noche de Jazz en el Sótano" },
          fecha: FECHA,
        },
      },
      resumen: {
        type: "object",
        properties: {
          tiposEntrada: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: ID,
                nombre: { type: "string", example: "VIP" },
                cupo: { type: "integer", example: 20 },
                vendidas: { type: "integer", example: 2 },
                disponibles: { type: "integer", example: 18 },
              },
            },
          },
          porEstado: {
            type: "object",
            example: { PENDIENTE: 0, CONFIRMADA: 1, UTILIZADA: 0, CANCELADA: 0, REEMBOLSADA: 0 },
          },
          recaudacionConfirmada: {
            type: "number",
            example: 84000,
            description: "Total de las compras CONFIRMADA y UTILIZADA",
          },
          reembolsosPendientes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                compraId: ID,
                total: { type: "number", example: 104000 },
                fechaLimiteReembolso: FECHA,
              },
            },
          },
        },
      },
      compras: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: ID,
            comprador: {
              type: "object",
              properties: {
                id: ID,
                nombre: { type: "string", example: "Ana" },
                apellido: { type: "string", example: "Gómez" },
              },
            },
            tipoEntrada: {
              type: "object",
              properties: { id: ID, nombre: { type: "string", example: "VIP" } },
            },
            cantidad: { type: "integer", example: 2 },
            total: { type: "number", example: 84000 },
            estado: { type: "string", example: "CONFIRMADA" },
            motivoCancelacion: { type: "string", nullable: true, example: null },
            fechaCompra: FECHA,
            reembolsoPendiente: { type: "boolean", example: false },
            fechaLimiteReembolso: { ...FECHA, nullable: true },
            acciones: {
              type: "object",
              properties: { puedeReembolsar: { type: "boolean", example: false } },
            },
          },
        },
      },
    },
  },
  Notificacion: {
    type: "object",
    properties: {
      id: ID,
      tipo: {
        type: "string",
        enum: [
          "NUEVA_COMPRA",
          "COMPRA_CONFIRMADA",
          "COMPRA_CANCELADA",
          "COMPRA_VENCIDA",
          "REEMBOLSO_REALIZADO",
          "EVENTO_CANCELADO",
          "ENTRADA_UTILIZADA",
          "NUEVO_MENSAJE",
          "NUEVA_RESENIA",
          "RECORDATORIO_EVENTO",
        ],
        example: "COMPRA_CANCELADA",
      },
      titulo: { type: "string", example: "Compra cancelada" },
      mensaje: {
        type: "string",
        example:
          'Bruno Díaz canceló 2 entradas Abono 2 días para "Festival Primavera Sonora". Tenés que reembolsar $104.000,00 antes del 18/11/2026 15:00; si no, el reembolso se hace automáticamente.',
      },
      datos: { type: "object", properties: { compraId: ID, eventoId: ID } },
      fecha: FECHA,
      leida: { type: "boolean", example: false },
    },
  },
  PaginaNotificaciones: {
    type: "object",
    properties: {
      items: { type: "array", items: { $ref: "#/components/schemas/Notificacion" } },
      total: { type: "integer", example: 4 },
      pagina: { type: "integer", example: 1 },
      limite: { type: "integer", example: 10 },
    },
  },
};
