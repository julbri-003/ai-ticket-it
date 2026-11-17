export const EstadoCompra = Object.freeze({
  PENDIENTE: "PENDIENTE",
  CONFIRMADA: "CONFIRMADA",
  UTILIZADA: "UTILIZADA",
  CANCELADA: "CANCELADA",
  REEMBOLSADA: "REEMBOLSADA",
});

export const MotivoCancelacion = Object.freeze({
  CANCELADA_POR_COMPRADOR: "CANCELADA_POR_COMPRADOR",
  VENCIDA: "VENCIDA",
  EVENTO_CANCELADO: "EVENTO_CANCELADO",
});

/** Quién figura en el historial cuando una transición la dispara una tarea programada. */
export const ACTOR_SISTEMA = Object.freeze({ id: "SISTEMA", nombre: "Sistema" });

export const ROL_SISTEMA = "SISTEMA";
