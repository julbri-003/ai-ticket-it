import { BadRequestError, ConflictError, NotFoundError } from "../errors/AppError.js";
import { mismoId } from "../utils/id.js";
import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import { TipoEntrada } from "./tipoEntradaDominio.js";
import { fechaValida, idObligatorio, textoObligatorio, textoOpcional } from "./validaciones.js";

export const TipoMultimedia = Object.freeze({
  IMAGEN: "imagen",
  VIDEO: "video",
});

export const MAX_TEXTO_AMPLIACION = 2000;

// Campos que se pueden enviar a editar(); cualquier otro se rechaza.
const CAMBIOS_PERMITIDOS = [
  "multimediaNueva",
  "multimediaAQuitar",
  "tiposEntradaNuevos",
  "ampliacionDescripcion",
];

const MENSAJES_CAMPO_NO_EDITABLE = {
  descripcion: "La descripción original no se puede editar: agregá una ampliación",
  tiposEntrada:
    "Los tipos de entrada existentes no se pueden modificar ni borrar: solo se pueden agregar nuevos",
  multimedia: "La multimedia se edita agregando (multimediaNueva) o quitando (multimediaAQuitar)",
};

// Funciones fuera de la clase (no #privadas): los documentos de mongoose cargados con
// loadClass no son instancias reales y no pueden acceder a miembros #privados.

function normalizarMultimedia(item) {
  const ruta = textoObligatorio(item?.ruta, "Cada archivo multimedia debe tener una ruta");
  if (!Object.values(TipoMultimedia).includes(item.tipo)) {
    throw new BadRequestError('El tipo de multimedia debe ser "imagen" o "video"');
  }
  const alt =
    item.tipo === TipoMultimedia.IMAGEN
      ? textoObligatorio(
          item.alt,
          "Cada imagen debe tener un texto alternativo que describa su contenido",
        )
      : textoOpcional(item.alt, { campo: "El texto alternativo", max: 300 });
  return { ruta, tipo: item.tipo, alt };
}

function aTipoEntrada(tipo) {
  return tipo instanceof TipoEntrada ? tipo : new TipoEntrada(tipo);
}

function nombreNormalizado(nombre) {
  return nombre.trim().toLowerCase();
}

function exigirNombresUnicos(tipos) {
  const vistos = new Set();
  for (const tipo of tipos) {
    const nombre = nombreNormalizado(tipo.nombre);
    if (vistos.has(nombre)) {
      throw new BadRequestError(`Ya existe un tipo de entrada llamado "${tipo.nombre}"`);
    }
    vistos.add(nombre);
  }
}

function exigirEditable(evento, reloj) {
  if (!evento.activo) {
    throw new ConflictError("El evento está finalizado y ya no se puede editar");
  }
  if (evento.yaOcurrio(reloj)) {
    throw new ConflictError("El evento ya ocurrió y no se puede editar");
  }
}

function textoAmpliacion(texto) {
  const limpio = textoObligatorio(texto, "La ampliación de la descripción no puede estar vacía");
  if (limpio.length > MAX_TEXTO_AMPLIACION) {
    throw new BadRequestError(
      `La ampliación admite como máximo ${MAX_TEXTO_AMPLIACION} caracteres`,
    );
  }
  return limpio;
}

export class Evento extends Persistible {
  constructor({
    id = null,
    nombre,
    descripcion,
    ampliacionesDescripcion = [],
    categoriaId,
    fecha,
    lugar,
    tiposEntrada,
    multimedia = [],
    organizadorId,
    activo,
    fechaModificacion,
    modificadoPor,
  }) {
    super();
    if (!Array.isArray(tiposEntrada) || tiposEntrada.length === 0) {
      throw new BadRequestError("El evento debe tener al menos un tipo de entrada");
    }

    this.id = id;
    this.nombre = textoObligatorio(nombre, "El evento debe tener un nombre");
    this.descripcion = textoObligatorio(descripcion, "El evento debe tener una descripción");
    this.ampliacionesDescripcion = ampliacionesDescripcion.map(({ texto, fecha: f }) => ({
      texto,
      fecha: new Date(f),
    }));
    this.categoriaId = idObligatorio(categoriaId, "El evento debe tener una categoría");
    this.fecha = fechaValida(fecha, "El evento debe tener una fecha válida");
    this.lugar = textoObligatorio(lugar, "El evento debe tener un lugar");
    this.tiposEntrada = tiposEntrada.map(aTipoEntrada);
    exigirNombresUnicos(this.tiposEntrada);
    this.multimedia = multimedia.map(normalizarMultimedia);
    this.organizadorId = idObligatorio(organizadorId, "El evento debe tener un organizador");

    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }

  /** Alta de un evento nuevo: además de la estructura, exige que la fecha sea futura. */
  static crear(datos, reloj) {
    const evento = new Evento(datos);
    if (evento.yaOcurrio(reloj)) {
      throw new BadRequestError("La fecha del evento debe ser futura");
    }
    return evento;
  }

  yaOcurrio(reloj) {
    return this.fecha.getTime() <= reloj.ahora().getTime();
  }

  /** true si algún tipo de entrada tiene precio en [min, max]. Un extremo ausente queda abierto. */
  tuPrecioEstaEntre(min, max) {
    return this.tiposEntrada.some(
      ({ precio }) => (min == null || precio >= min) && (max == null || precio <= max),
    );
  }

  get precioMinimo() {
    return Math.min(...this.tiposEntrada.map(({ precio }) => precio));
  }

  get imagenPrincipal() {
    return this.multimedia.find(({ tipo }) => tipo === TipoMultimedia.IMAGEN) ?? null;
  }

  buscarTipoEntrada(tipoEntradaId) {
    const tipo = this.tiposEntrada.find((t) => mismoId(t, tipoEntradaId));
    if (!tipo) {
      throw new NotFoundError("El tipo de entrada no existe en este evento");
    }
    return tipo;
  }

  // ----- Edición restringida -----

  /**
   * Punto único de edición. Acepta solo:
   *   { multimediaNueva: [{ ruta, tipo, alt }], multimediaAQuitar: [ruta],
   *     tiposEntradaNuevos: [{ nombre, precio, cupo, ... }], ampliacionDescripcion: "texto" }
   * Cualquier otro campo lanza BadRequestError. Valida todo antes de aplicar nada.
   */
  editar(cambios, reloj) {
    if (cambios == null || typeof cambios !== "object" || Object.keys(cambios).length === 0) {
      throw new BadRequestError("No hay cambios para aplicar");
    }
    for (const campo of Object.keys(cambios)) {
      if (!CAMBIOS_PERMITIDOS.includes(campo)) {
        throw new BadRequestError(
          MENSAJES_CAMPO_NO_EDITABLE[campo] ??
            `El campo "${campo}" no se puede modificar una vez publicado el evento`,
        );
      }
    }
    exigirEditable(this, reloj);

    const { multimediaNueva, multimediaAQuitar, tiposEntradaNuevos, ampliacionDescripcion } =
      cambios;

    // 1) Preparar y validar todo.
    const nuevaMultimedia = (multimediaNueva ?? []).map(normalizarMultimedia);
    const rutasAQuitar = multimediaAQuitar ?? [];
    for (const ruta of rutasAQuitar) {
      if (!this.multimedia.some((m) => m.ruta === ruta)) {
        throw new NotFoundError(`El archivo ${ruta} no pertenece al evento`);
      }
    }
    const nuevosTipos = (tiposEntradaNuevos ?? []).map(aTipoEntrada);
    exigirNombresUnicos([...this.tiposEntrada, ...nuevosTipos]);
    const ampliacion =
      ampliacionDescripcion === undefined ? null : textoAmpliacion(ampliacionDescripcion);

    // 2) Aplicar.
    this.multimedia = this.multimedia.filter((m) => !rutasAQuitar.includes(m.ruta));
    this.multimedia.push(...nuevaMultimedia);
    this.tiposEntrada.push(...nuevosTipos);
    if (ampliacion) {
      this.ampliacionesDescripcion.push({ texto: ampliacion, fecha: reloj.ahora() });
    }
  }

  agregarMultimedia(items, reloj) {
    this.editar({ multimediaNueva: items }, reloj);
  }

  quitarMultimedia(ruta, reloj) {
    this.editar({ multimediaAQuitar: [ruta] }, reloj);
  }

  agregarTipoEntrada(tipo, reloj) {
    this.editar({ tiposEntradaNuevos: [tipo] }, reloj);
  }

  ampliarDescripcion(texto, reloj) {
    this.editar({ ampliacionDescripcion: texto }, reloj);
  }

  /** Baja lógica de un evento que ya ocurrió. Sigue visible en "Eventos anteriores". */
  finalizar(usuarioSistema, reloj) {
    if (!this.yaOcurrio(reloj)) {
      throw new ConflictError("Solo se puede finalizar un evento que ya ocurrió");
    }
    this.darDeBaja(usuarioSistema, reloj);
  }
}
