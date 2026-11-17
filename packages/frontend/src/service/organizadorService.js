import { comprasApi } from "./apis/comprasApi";
import { eventosApi } from "./apis/eventosApi";
import { aCompraDetalle } from "./comprasService";
import { aEvento, quedanTexto } from "./eventosService";
import { ETIQUETAS_ESTADO } from "../utils/estadosCompra";
import { diaHoraTexto, faltanTexto, tiempoRestanteTexto } from "../utils/fechas";
import { montoTexto } from "../utils/montos";

const MB = 1024 * 1024;
export const LIMITES_ARCHIVO = {
  imagen: {
    tipos: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: 5 * MB,
    etiqueta: "JPG, PNG o WEBP de hasta 5 MB",
  },
  video: { tipos: ["video/mp4"], maxBytes: 20 * MB, etiqueta: "MP4 de hasta 20 MB" },
};
export const MAX_ARCHIVOS = 6;
export const MAX_ALT = 300;

// ----- Validaciones del formulario (cliente; el back vuelve a validar) -----

/** Paso 1: datos del evento. `fecha` es un Date. */
export function validarDatosEvento(
  { nombre, categoriaId, fecha, lugar, descripcion },
  ahora = new Date(),
) {
  const errores = {};
  if (!nombre?.trim()) errores.nombre = "Poné el nombre del evento.";
  if (!categoriaId) errores.categoriaId = "Elegí una categoría.";
  if (!fecha) errores.fecha = "Elegí la fecha y la hora.";
  else if (fecha.getTime() <= ahora.getTime()) errores.fecha = "La fecha tiene que ser futura.";
  if (!lugar?.trim()) errores.lugar = "Indicá dónde es el evento.";
  if (!descripcion?.trim()) errores.descripcion = "Contá de qué se trata el evento.";
  return errores;
}

/** Un tipo de entrada del formulario: { nombre, descripcion, precio (texto), cupo (texto) }. */
export function validarTipoEntrada(tipo, nombresExistentes = []) {
  const errores = {};
  const nombre = tipo.nombre?.trim() ?? "";
  const precio = Number(String(tipo.precio ?? "").replace(",", "."));
  const cupo = Number(tipo.cupo);
  if (!nombre) errores.nombre = "Poné un nombre (ej. General, VIP).";
  else if (nombresExistentes.some((n) => n.trim().toLowerCase() === nombre.toLowerCase())) {
    errores.nombre = `Ya hay un tipo de entrada llamado "${nombre}".`;
  }
  if (!String(tipo.precio ?? "").trim() || !Number.isFinite(precio) || precio <= 0)
    errores.precio = "El precio tiene que ser mayor a 0.";
  if (!String(tipo.cupo ?? "").trim() || !Number.isInteger(cupo) || cupo <= 0)
    errores.cupo = "El cupo tiene que ser un número entero mayor a 0.";
  return errores;
}

/** Paso 2: al menos un tipo y nombres únicos. Devuelve { general, porTipo: [errores] }. */
export function validarTiposEntrada(tipos) {
  const porTipo = tipos.map((tipo, i) =>
    validarTipoEntrada(
      tipo,
      tipos.filter((_, j) => j < i).map((t) => t.nombre ?? ""),
    ),
  );
  const general = tipos.length === 0 ? "Agregá al menos un tipo de entrada." : null;
  const hayErrores = Boolean(general) || porTipo.some((e) => Object.keys(e).length > 0);
  return { general, porTipo, hayErrores };
}

/** Archivo elegido con el picker: { uri, nombre, mimeType, tamanio, tipo: imagen|video, alt }. */
export function validarArchivo(archivo) {
  const limite = LIMITES_ARCHIVO[archivo.tipo];
  if (!limite || !limite.tipos.includes(archivo.mimeType)) {
    return `Formato no permitido. Usá imágenes ${LIMITES_ARCHIVO.imagen.etiqueta} o videos ${LIMITES_ARCHIVO.video.etiqueta}.`;
  }
  if (archivo.tamanio && archivo.tamanio > limite.maxBytes) {
    return `El archivo supera el máximo (${limite.etiqueta}).`;
  }
  return null;
}

/** Texto alternativo obligatorio en imágenes y videos. */
export function validarAlt(archivo) {
  const alt = archivo.alt?.trim() ?? "";
  if (!alt)
    return archivo.tipo === "video"
      ? "Describí qué se ve en el video."
      : "Describí qué se ve en la imagen.";
  if (alt.length > MAX_ALT) return `Máximo ${MAX_ALT} caracteres.`;
  return null;
}

// ----- Mapeos -----

function vencimientoTexto(iso) {
  return iso ? `vence en ${tiempoRestanteTexto(iso)}` : null;
}

/** Evento de "Mis eventos" con ocupación, conteo por estado y reembolsos pendientes. */
export function aEventoOrganizador(dto) {
  const base = aEvento(dto);
  const cupoTotal = dto.tiposEntrada.reduce((s, t) => s + t.cupo, 0);
  const vendidasTotal = dto.tiposEntrada.reduce((s, t) => s + t.vendidas, 0);
  const reembolsos = dto.reembolsosPendientes ?? { cantidad: 0, proximoVencimiento: null };
  const enCartel = !base.cancelado && !base.anterior;
  const quedan = cupoTotal - vendidasTotal;
  return {
    ...base,
    cupoTotal,
    vendidasTotal,
    salaLlena: !base.cancelado && cupoTotal > 0 && quedan <= 0,
    quedanPocas: enCartel && cupoTotal > 0 && quedan > 0 && quedan <= cupoTotal * 0.1,
    faltanTexto: enCartel ? faltanTexto(dto.fecha) : null,
    ocupacion: cupoTotal ? vendidasTotal / cupoTotal : 0,
    porEstado: dto.comprasPorEstado ?? {},
    reembolsos: {
      cantidad: reembolsos.cantidad,
      texto:
        reembolsos.cantidad > 0
          ? `${reembolsos.cantidad} ${reembolsos.cantidad === 1 ? "reembolso" : "reembolsos"} por hacer · ${vencimientoTexto(reembolsos.proximoVencimiento)}`
          : null,
    },
    tiposEntrada: base.tiposEntrada.map((t, i) => ({
      ...t,
      cupo: dto.tiposEntrada[i].cupo,
      vendidas: dto.tiposEntrada[i].vendidas,
    })),
  };
}

/**
 * Resumen de "Mis eventos": entradas vendidas y ocupación promedio (sobre el cupo total) de los
 * próximos, y reembolsos pendientes de todos los eventos. Ocupación en % entero.
 */
export function resumenOrganizador(eventos = []) {
  const proximos = eventos.filter((e) => !e.cancelado && !e.anterior);
  const vendidas = proximos.reduce((s, e) => s + e.vendidasTotal, 0);
  const cupo = proximos.reduce((s, e) => s + e.cupoTotal, 0);
  return {
    vendidas,
    ocupacion: cupo ? Math.round((vendidas / cupo) * 100) : 0,
    reembolsos: eventos.reduce((s, e) => s + (e.reembolsos?.cantidad ?? 0), 0),
  };
}

function aCompraDeEvento(dto) {
  return {
    id: dto.id,
    comprador:
      [dto.comprador?.nombre, dto.comprador?.apellido].filter(Boolean).join(" ") || "Comprador",
    tipoEntrada: dto.tipoEntrada.nombre,
    cantidad: dto.cantidad,
    total: dto.total,
    totalTexto: montoTexto(dto.total),
    estado: dto.estado,
    estadoTexto: ETIQUETAS_ESTADO[dto.estado] ?? dto.estado,
    fechaTexto: diaHoraTexto(dto.fechaCompra),
    reembolsoPendiente: dto.reembolsoPendiente,
    fechaLimiteReembolsoTexto: dto.fechaLimiteReembolso
      ? diaHoraTexto(dto.fechaLimiteReembolso)
      : null,
    puedeReembolsar: dto.acciones?.puedeReembolsar ?? false,
  };
}

/** Resumen de compras de un evento + precios de sus tipos (del detalle del evento). */
export function aComprasDelEvento(dto, tiposConPrecio = []) {
  const precioPorId = new Map(tiposConPrecio.map((t) => [t.id, t.precio]));
  const { resumen } = dto;
  return {
    evento: dto.evento,
    tipos: resumen.tiposEntrada.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      precioTexto: precioPorId.has(t.id) ? montoTexto(precioPorId.get(t.id)) : null,
      cupo: t.cupo,
      vendidas: t.vendidas,
      disponibles: t.disponibles,
      quedanTexto: quedanTexto(t.disponibles),
      ocupacion: t.cupo ? t.vendidas / t.cupo : 0,
    })),
    porEstado: resumen.porEstado,
    recaudacionTexto: montoTexto(resumen.recaudacionConfirmada),
    reembolsosPendientes: resumen.reembolsosPendientes.length,
    compras: dto.compras.map(aCompraDeEvento),
  };
}

// ----- Casos de uso -----

export const organizadorService = {
  async misEventos() {
    return (await eventosApi.mios()).map(aEventoOrganizador);
  },

  async crearEvento({ nombre, categoriaId, fecha, lugar, descripcion, tiposEntrada }) {
    const dto = await eventosApi.crear({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      categoriaId,
      fecha: fecha.toISOString(),
      lugar: lugar.trim(),
      tiposEntrada: tiposEntrada.map((t) => ({
        nombre: t.nombre.trim(),
        ...(t.descripcion?.trim() ? { descripcion: t.descripcion.trim() } : {}),
        precio: Number(String(t.precio).replace(",", ".")),
        cupo: Number(t.cupo),
      })),
    });
    return aEvento(dto);
  },

  /** Sube archivos con su texto alternativo (mismo orden). `alProgreso(0..1)` opcional. */
  async subirMultimedia(eventoId, archivos, alProgreso) {
    const datos = new FormData();
    for (const archivo of archivos) {
      datos.append("archivos", { uri: archivo.uri, name: archivo.nombre, type: archivo.mimeType });
    }
    for (const archivo of archivos) datos.append("alts", archivo.alt.trim());
    return aEvento(await eventosApi.subirMultimedia(eventoId, datos, alProgreso));
  },

  async quitarMultimedia(eventoId, ruta) {
    return aEvento(await eventosApi.quitarMultimedia(eventoId, ruta));
  },

  async agregarTipoEntrada(eventoId, tipo) {
    return aEvento(
      await eventosApi.agregarTipoEntrada(eventoId, {
        nombre: tipo.nombre.trim(),
        ...(tipo.descripcion?.trim() ? { descripcion: tipo.descripcion.trim() } : {}),
        precio: Number(String(tipo.precio).replace(",", ".")),
        cupo: Number(tipo.cupo),
      }),
    );
  },

  /** Cancela el evento con motivo; el back cancela y reembolsa todas las compras. */
  async cancelarEvento(eventoId, motivo) {
    const dto = await eventosApi.cancelar(eventoId, motivo.trim());
    return { evento: aEvento(dto), comprasResueltas: dto.comprasResueltas ?? 0 };
  },

  async ampliar(eventoId, texto) {
    return aEvento(await eventosApi.ampliar(eventoId, texto.trim()));
  },

  /** Detalle con datos crudos para editar (tipos con cupo y vendidas, multimedia con ruta). */
  async eventoParaEditar(eventoId) {
    const dto = await eventosApi.detalle(eventoId);
    return {
      ...aEvento(dto),
      tiposEntrada: dto.tiposEntrada.map((t) => ({
        id: t.id,
        nombre: t.nombre,
        descripcion: t.descripcion,
        precioTexto: montoTexto(t.precio),
        cupo: t.cupo,
        vendidas: t.vendidas,
        disponibles: t.disponibles,
      })),
      multimedia: dto.multimedia.map((m) => ({
        ruta: m.ruta,
        uri: m.url,
        tipo: m.tipo,
        alt: m.alt,
      })),
    };
  },

  async comprasDelEvento(eventoId, { estado } = {}) {
    const [dto, evento] = await Promise.all([
      eventosApi.comprasDelEvento(eventoId, estado ? { estado } : {}),
      eventosApi.detalle(eventoId),
    ]);
    return aComprasDelEvento(dto, evento.tiposEntrada);
  },

  async reembolsar(compraId, usuarioId) {
    return aCompraDetalle(await comprasApi.reembolsar(compraId), usuarioId);
  },
};

export default organizadorService;
