// Textos de las notificaciones in-app. Misma forma que REPO_REF: { titulo, mensaje: (vars) => string }.
// Los montos y fechas llegan ya formateados ("$45.000,00", "17/11/2026 21:00").

export const TiposNotificacion = Object.freeze({
  NUEVA_COMPRA: "NUEVA_COMPRA",
  COMPRA_CONFIRMADA: "COMPRA_CONFIRMADA",
  COMPRA_CANCELADA: "COMPRA_CANCELADA",
  COMPRA_VENCIDA: "COMPRA_VENCIDA",
  REEMBOLSO_REALIZADO: "REEMBOLSO_REALIZADO",
  EVENTO_CANCELADO: "EVENTO_CANCELADO",
  ENTRADA_UTILIZADA: "ENTRADA_UTILIZADA",
  NUEVO_MENSAJE: "NUEVO_MENSAJE",
  NUEVA_RESENIA: "NUEVA_RESENIA",
  RECORDATORIO_EVENTO: "RECORDATORIO_EVENTO",
});

const entradas = (cantidad, tipo) =>
  `${cantidad} ${cantidad === 1 ? "entrada" : "entradas"} ${tipo}`;

export const notificationTemplates = {
  NUEVA_COMPRA: {
    titulo: "Nueva compra",
    mensaje: ({ comprador, cantidad, tipoEntrada, evento, total }) =>
      `${comprador} reservó ${entradas(cantidad, tipoEntrada)} para "${evento}" por ${total}. Queda pendiente de pago.`,
  },

  COMPRA_CONFIRMADA: {
    titulo: "Compra confirmada",
    mensaje: ({ paraOrganizador, comprador, cantidad, tipoEntrada, evento, total }) =>
      paraOrganizador
        ? `${comprador} pagó ${entradas(cantidad, tipoEntrada)} para "${evento}" (${total}).`
        : `¡Listo! Tus ${entradas(cantidad, tipoEntrada)} para "${evento}" están confirmadas (${total}).`,
  },

  COMPRA_CANCELADA: {
    titulo: "Compra cancelada",
    mensaje: ({
      comprador,
      cantidad,
      tipoEntrada,
      evento,
      total,
      debeReembolsar,
      fechaLimiteReembolso,
    }) =>
      debeReembolsar
        ? `${comprador} canceló ${entradas(cantidad, tipoEntrada)} para "${evento}". Tenés que reembolsar ${total} antes del ${fechaLimiteReembolso}; si no, el reembolso se hace automáticamente.`
        : `${comprador} canceló ${entradas(cantidad, tipoEntrada)} para "${evento}" antes de pagar. No hay nada que reembolsar.`,
  },

  COMPRA_VENCIDA: {
    titulo: "Tu reserva venció",
    mensaje: ({ evento, cantidad, tipoEntrada }) =>
      `Tu reserva de ${entradas(cantidad, tipoEntrada)} para "${evento}" venció porque no se registró el pago. Si todavía hay lugar, podés volver a comprar.`,
  },

  REEMBOLSO_REALIZADO: {
    titulo: "Reembolso realizado",
    mensaje: ({ evento, total, automatico }) =>
      automatico
        ? `Te reembolsamos ${total} por tu compra cancelada de "${evento}" (reembolso automático).`
        : `El organizador te reembolsó ${total} por tu compra cancelada de "${evento}".`,
  },

  EVENTO_CANCELADO: {
    titulo: "Evento cancelado",
    mensaje: ({ evento, motivo, total, reembolsado }) =>
      reembolsado
        ? `"${evento}" fue cancelado por el organizador (${motivo}). Te reembolsamos ${total} automáticamente.`
        : `"${evento}" fue cancelado por el organizador (${motivo}). Tu reserva quedó cancelada; no se te cobró nada.`,
  },

  ENTRADA_UTILIZADA: {
    titulo: "¿Qué te pareció?",
    mensaje: ({ evento }) =>
      `Esperamos que hayas disfrutado "${evento}". Contanos tu experiencia con una reseña.`,
  },

  NUEVO_MENSAJE: {
    titulo: "Nuevo mensaje",
    mensaje: ({ autor, evento, extracto }) =>
      `${autor} te escribió sobre "${evento}": "${extracto}"`,
  },

  NUEVA_RESENIA: {
    titulo: "Nueva reseña",
    mensaje: ({ comprador, evento, puntuacion }) =>
      `${comprador} calificó "${evento}" con ${puntuacion} ${puntuacion === 1 ? "estrella" : "estrellas"}.`,
  },

  RECORDATORIO_EVENTO: {
    titulo: "¡Mañana es la función!",
    mensaje: ({ evento, fecha, lugar }) =>
      `"${evento}" es el ${fecha} en ${lugar}. ¡No te olvides tus entradas!`,
  },
};
