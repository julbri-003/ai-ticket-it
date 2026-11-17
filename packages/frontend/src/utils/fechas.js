// Formatos de fecha en es-AR (la API devuelve ISO UTC; se muestran en la hora del dispositivo).

const formato = (opciones) => new Intl.DateTimeFormat("es-AR", opciones);
const fechaHoraCorta = formato({
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});
const diaMes = formato({ day: "2-digit", month: "2-digit" });
const hora = formato({ hour: "2-digit", minute: "2-digit", hour12: false });
const fechaLarga = formato({ weekday: "long", day: "numeric", month: "long", year: "numeric" });

/** "sáb, 22 nov, 21:00" */
export const fechaHoraTexto = (iso) => fechaHoraCorta.format(new Date(iso));

/** "18/11 15:30" */
export const diaHoraTexto = (iso) =>
  `${diaMes.format(new Date(iso))} ${hora.format(new Date(iso))}`;

/** "12/11" */
export const diaMesTexto = (iso) => diaMes.format(new Date(iso));

/** "sábado, 22 de noviembre de 2026" */
export const fechaLargaTexto = (iso) => fechaLarga.format(new Date(iso));

/** "21:00" */
export const horaTexto = (iso) => hora.format(new Date(iso));

/** Días que faltan para el evento: "Hoy", "Mañana", "Faltan N días". */
export function diasRestantesTexto(n) {
  if (n == null) return null;
  if (n <= 0) return "Hoy";
  if (n === 1) return "Mañana";
  return `Faltan ${n} días`;
}

/** Tiempo restante legible hasta una fecha: "1 h 05 min", "2 d 3 h" o "Venció". */
export function tiempoRestanteTexto(hastaIso, ahora = new Date()) {
  const ms = new Date(hastaIso).getTime() - ahora.getTime();
  if (ms <= 0) return "Venció";
  const minutos = Math.floor(ms / 60000);
  const dias = Math.floor(minutos / 1440);
  const horas = Math.floor((minutos % 1440) / 60);
  const mins = minutos % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${String(mins).padStart(2, "0")} min`;
  return `${mins} min`;
}

// ----- Fechas que escribe el usuario (DD/MM/AAAA) -----

/** "25/12/2026" → "2026-12-25" (o null si no es una fecha válida). */
export function textoAFechaIso(texto) {
  const coincidencia = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((texto ?? "").trim());
  if (!coincidencia) return null;
  const [, d, m, a] = coincidencia.map(Number);
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d)
    return null;
  return `${String(a)}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Date → "DD/MM/AAAA" en hora local. */
export function fechaATexto(fecha) {
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${fecha.getFullYear()}`;
}

/** Atajos de rango de fechas para el panel de filtros. */
export function atajoFechas(atajo, hoy = new Date()) {
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (atajo === "finde") {
    const dia = base.getDay(); // 0 domingo … 6 sábado
    const sabado = new Date(base);
    sabado.setDate(base.getDate() + (dia === 0 ? -1 : 6 - dia));
    const domingo = new Date(sabado);
    domingo.setDate(sabado.getDate() + 1);
    const desde = dia === 0 || dia === 6 ? base : sabado;
    return { desde: fechaATexto(desde), hasta: fechaATexto(domingo) };
  }
  if (atajo === "semana") {
    const hasta = new Date(base);
    hasta.setDate(base.getDate() + 7);
    return { desde: fechaATexto(base), hasta: fechaATexto(hasta) };
  }
  // mes
  const finDeMes = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { desde: fechaATexto(base), hasta: fechaATexto(finDeMes) };
}

// ----- Detalles de "Telón de terciopelo" (chip de talón y cuenta regresiva) -----

const mesCorto = formato({ month: "short" });

/** Día y mes para el chip de talón: { dia: 22, mes: "NOV" } (o null sin fecha). */
export function chipFecha(iso) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return null;
  return { dia: fecha.getDate(), mes: mesCorto.format(fecha).replace(".", "").toUpperCase() };
}

/**
 * Cuenta regresiva en días calendario hasta un evento: "Hoy", "Mañana", "Faltan N días".
 * Si la fecha ya pasó (o no hay fecha), null.
 */
export function faltanTexto(iso, ahora = new Date()) {
  if (!iso) return null;
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime()) || fecha < ahora) return null;
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(fecha) - inicio(ahora)) / 86400000);
  return diasRestantesTexto(dias);
}
