import { mensajesApi } from "./apis/mensajesApi";
import { ETIQUETAS_ESTADO } from "../utils/estadosCompra";
import { diaMesTexto, horaTexto } from "../utils/fechas";

export const MAX_CARACTERES_MENSAJE = 1000;

const ROLES = { COMPRADOR: "Comprador", ORGANIZADOR: "Organizador" };

/** DTO de mensaje → modelo de UI. `usuarioId` para distinguir los propios. */
export function aMensaje(dto, usuarioId) {
  return {
    id: dto.id,
    texto: dto.mensaje,
    autor: dto.usuarioNombre,
    rolTexto: ROLES[dto.rol] ?? dto.rol,
    propio: String(dto.usuarioId) === String(usuarioId),
    enviado: dto.enviado,
    horaTexto: horaTexto(dto.enviado),
    estado: "enviado", // "enviando" | "error" para los optimistas
  };
}

/** "Hoy", "Ayer" o la fecha (para los separadores por día del chat). */
export function textoDia(iso, hoy = new Date()) {
  const fecha = new Date(iso);
  const mismoDia = (a, b) => a.toDateString() === b.toDateString();
  if (mismoDia(fecha, hoy)) return "Hoy";
  const ayer = new Date(hoy);
  ayer.setDate(hoy.getDate() - 1);
  if (mismoDia(fecha, ayer)) return "Ayer";
  return diaMesTexto(iso);
}

/** Inserta separadores de día: [{ tipo: "dia", id, texto } | { tipo: "mensaje", ...mensaje }]. */
export function conSeparadores(mensajes, hoy = new Date()) {
  const filas = [];
  let ultimoDia = null;
  for (const m of mensajes) {
    const dia = new Date(m.enviado).toDateString();
    if (dia !== ultimoDia) {
      filas.push({ tipo: "dia", id: `dia-${dia}`, texto: textoDia(m.enviado, hoy) });
      ultimoDia = dia;
    }
    filas.push({ tipo: "mensaje", ...m });
  }
  return filas;
}

/** Une mensajes sin repetir (por id) y los ordena por fecha de envío. */
export function unirMensajes(actuales, nuevos) {
  const porId = new Map(actuales.map((m) => [m.id, m]));
  for (const m of nuevos) porId.set(m.id, { ...porId.get(m.id), ...m });
  return [...porId.values()].sort((a, b) => Date.parse(a.enviado) - Date.parse(b.enviado));
}

const GRUPOS = ["Hoy", "Ayer", "Esta semana", "Antes"];

/** Grupo de la bandeja según la fecha del último mensaje: Hoy, Ayer, Esta semana o Antes. */
function grupoDe(iso, ahora) {
  const inicio = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dias = Math.round((inicio(ahora) - inicio(new Date(iso))) / 86400000);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  if (dias < 7) return "Esta semana";
  return "Antes";
}

/**
 * Agrupa las conversaciones (ya ordenadas por último mensaje) bajo "Hoy", "Ayer", "Esta semana"
 * y "Antes". Respeta el orden de entrada dentro de cada grupo y omite los grupos vacíos.
 */
export function agruparConversaciones(items = [], ahora = new Date()) {
  const porGrupo = new Map(GRUPOS.map((g) => [g, []]));
  for (const c of items) porGrupo.get(grupoDe(c.enviado, ahora)).push(c);
  return GRUPOS.filter((g) => porGrupo.get(g).length > 0).map((titulo) => ({
    titulo,
    items: porGrupo.get(titulo),
  }));
}

function aConversacion(dto, usuarioId) {
  return {
    compraId: dto.compraId,
    estado: dto.estado,
    estadoTexto: ETIQUETAS_ESTADO[dto.estado] ?? dto.estado,
    evento: {
      id: dto.evento.id,
      nombre: dto.evento.nombre,
      imagen: dto.evento.imagen ? { uri: dto.evento.imagen.url, alt: dto.evento.imagen.alt } : null,
    },
    detalleTexto: `${dto.cantidad} × ${dto.tipoEntrada}`,
    otro: { nombre: dto.otro.nombre, rolTexto: ROLES[dto.otro.rol] ?? dto.otro.rol },
    ultimoMensaje: aMensaje(dto.ultimoMensaje, usuarioId),
    enviado: dto.ultimoMensaje.enviado,
    cuandoTexto:
      textoDia(dto.ultimoMensaje.enviado) === "Hoy"
        ? horaTexto(dto.ultimoMensaje.enviado)
        : textoDia(dto.ultimoMensaje.enviado),
    noLeidos: dto.mensajesNoLeidos,
  };
}

export const mensajesService = {
  async listar(compraId, usuarioId, desde) {
    const { mensajes, mensajesNoLeidos } = await mensajesApi.listar(compraId, desde);
    return { mensajes: mensajes.map((m) => aMensaje(m, usuarioId)), noLeidos: mensajesNoLeidos };
  },
  async enviar(compraId, texto, usuarioId) {
    return aMensaje(await mensajesApi.enviar(compraId, texto.trim()), usuarioId);
  },
  marcarLeidos: (compraId) => mensajesApi.marcarLeidos(compraId),
  async conversaciones(usuarioId, { pagina = 1, limite = 10 } = {}) {
    const r = await mensajesApi.conversaciones({ pagina, limite });
    return { ...r, items: r.items.map((c) => aConversacion(c, usuarioId)) };
  },
  async totalNoLeidos() {
    const { totalNoLeidos } = await mensajesApi.conversaciones({ pagina: 1, limite: 1 });
    return totalNoLeidos;
  },
};

export default mensajesService;
