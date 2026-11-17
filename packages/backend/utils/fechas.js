// Formato de fechas para textos que se guardan ya armados (notificaciones). La API sigue
// devolviendo fechas ISO UTC; esto es solo para el texto legible, en hora de Argentina.
const formatoFechaHora = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Argentina/Buenos_Aires",
});

/** 2026-11-18T00:00:00Z → "17/11/2026 21:00" */
export function formatearFechaHora(fecha) {
  return formatoFechaHora.format(new Date(fecha)).replace(",", "");
}
