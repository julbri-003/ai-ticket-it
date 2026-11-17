import { z } from "zod";
import { baseUrlDe } from "./dto/urls.js";
import { eventoToDTO } from "./dto/eventoDTO.js";
import { reseniaToDTO } from "./dto/reseniaDTO.js";
import { organizadorToDTO } from "./dto/usuarioDTO.js";
import {
  booleanoQuery,
  fechaIso,
  idParamSchema,
  objectId,
  paginadoSchema,
} from "./validaciones.js";

const FIN_DEL_DIA_MS = 24 * 60 * 60 * 1000 - 1;
const esSoloFecha = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v);

export const busquedaSchema = paginadoSchema
  .extend({
    q: z.string().trim().max(100, "La búsqueda admite como máximo 100 caracteres").optional(),
    categoriaIds: z
      .string()
      .transform((csv) =>
        csv
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean),
      )
      .pipe(z.array(objectId("Cada categoría")).min(1, "Indicá al menos una categoría"))
      .optional(),
    precioMin: z.coerce.number().min(0, "precioMin no puede ser negativo").optional(),
    precioMax: z.coerce.number().min(0, "precioMax no puede ser negativo").optional(),
    fechaDesde: fechaIso.transform((v) => new Date(v)).optional(),
    // Solo fecha → incluye todo ese día.
    fechaHasta: fechaIso
      .transform((v) => new Date(esSoloFecha(v) ? Date.parse(v) + FIN_DEL_DIA_MS : v))
      .optional(),
    conDisponibilidad: booleanoQuery.optional(),
    puntajeMin: z.coerce.number().min(0).max(5, "puntajeMin debe estar entre 0 y 5").optional(),
    paraVos: booleanoQuery.optional(),
    orden: z
      .enum(["fecha", "precio", "puntaje", "relevancia"], {
        error: "orden debe ser fecha, precio, puntaje o relevancia",
      })
      .default("fecha"),
    direccion: z.enum(["asc", "desc"], { error: "direccion debe ser asc o desc" }).optional(),
    anteriores: booleanoQuery.default(false),
  })
  .refine((f) => f.precioMin == null || f.precioMax == null || f.precioMin <= f.precioMax, {
    message: "El precio mínimo no puede ser mayor que el precio máximo",
    path: ["precioMin"],
  })
  .refine((f) => !f.fechaDesde || !f.fechaHasta || f.fechaDesde <= f.fechaHasta, {
    message: "La fecha desde no puede ser posterior a la fecha hasta",
    path: ["fechaDesde"],
  })
  .refine((f) => f.orden !== "relevancia" || f.paraVos === true, {
    message: 'El orden "relevancia" solo se puede usar con paraVos=true',
    path: ["orden"],
  });

export const tipoEntradaSchema = z
  .object({
    nombre: z.string().trim().min(1, "El tipo de entrada debe tener un nombre").max(60),
    descripcion: z.string().trim().max(500).optional(),
    precio: z
      .number({ error: "El precio debe ser un número" })
      .positive("El precio debe ser mayor a 0"),
    cupo: z
      .number({ error: "El cupo debe ser un número" })
      .int("El cupo debe ser un número entero")
      .positive("El cupo debe ser mayor a 0")
      .max(100000),
  })
  .strict();

export const crearEventoSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(120),
    descripcion: z.string().trim().min(1, "La descripción es obligatoria").max(5000),
    categoriaId: objectId("La categoría"),
    fecha: z.iso.datetime({ offset: true, error: "La fecha debe incluir hora y zona (ISO 8601)" }),
    lugar: z.string().trim().min(1, "El lugar es obligatorio").max(200),
    tiposEntrada: z
      .array(tipoEntradaSchema, { error: "tiposEntrada debe ser una lista" })
      .min(1, "El evento debe tener al menos un tipo de entrada")
      .max(20, "Un evento admite como máximo 20 tipos de entrada"),
  })
  .strict();

export const ampliacionSchema = z
  .object({ texto: z.string().trim().min(1, "La ampliación no puede estar vacía").max(2000) })
  .strict();

export const cancelacionSchema = z
  .object({
    motivo: z
      .string({ error: "Contá el motivo de la cancelación" })
      .trim()
      .min(1, "Contá el motivo de la cancelación")
      .max(500, "El motivo admite como máximo 500 caracteres"),
  })
  .strict();

export const quitarMultimediaSchema = z
  .object({ ruta: z.string().trim().min(1, "Indicá la ruta del archivo a quitar") })
  .strict();

/** En multipart, "alts" llega como string (un archivo) o array (varios). */
export const multimediaSchema = z
  .object({
    alts: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : [v]).map((a) => a.trim()))
      .optional(),
  })
  .strict();

export class EventosController {
  constructor({ eventosService, recomendacionesService, reseniasService, reloj }) {
    this.eventosService = eventosService;
    this.recomendacionesService = recomendacionesService;
    this.reseniasService = reseniasService;
    this.reloj = reloj;
  }

  #dto(req, { evento, categoria, organizador, esFavorito }) {
    return eventoToDTO(evento, {
      reloj: this.reloj,
      baseUrl: baseUrlDe(req),
      categoria,
      organizador,
      esFavorito,
    });
  }

  async buscar(req, res) {
    const filtros = busquedaSchema.parse(req.query);
    const resultado = await this.eventosService.buscar(filtros, req.user);
    res.json({ ...resultado, items: resultado.items.map((vista) => this.#dto(req, vista)) });
  }

  async recomendados(req, res) {
    const paginado = paginadoSchema.parse(req.query);
    const resultado = await this.recomendacionesService.recomendados(req.user, paginado);
    res.json({ ...resultado, items: resultado.items.map((vista) => this.#dto(req, vista)) });
  }

  async detalle(req, res) {
    const { id } = idParamSchema.parse(req.params);
    res.json(this.#dto(req, await this.eventosService.detalle(id, req.user)));
  }

  async resenias(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const paginado = paginadoSchema.parse(req.query);
    const resultado = await this.reseniasService.listarPorOrganizadorDelEvento(id, paginado);
    res.json({
      ...resultado,
      organizador: organizadorToDTO(resultado.organizador),
      items: resultado.items.map(({ resenia, evento }) => reseniaToDTO(resenia, { evento })),
    });
  }

  async mios(req, res) {
    const vistas = await this.eventosService.listarMios(req.user);
    res.json(
      vistas.map((vista) => ({
        ...this.#dto(req, vista),
        comprasPorEstado: vista.comprasPorEstado,
        reembolsosPendientes: vista.reembolsosPendientes,
      })),
    );
  }

  async crear(req, res) {
    const datos = crearEventoSchema.parse(req.body);
    res.status(201).json(this.#dto(req, await this.eventosService.crear(datos, req.user)));
  }

  async agregarMultimedia(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const { alts = [] } = multimediaSchema.parse(req.body ?? {});
    const vista = await this.eventosService.agregarMultimedia(id, req.files, alts, req.user);
    res.status(201).json(this.#dto(req, vista));
  }

  async quitarMultimedia(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const { ruta } = quitarMultimediaSchema.parse(req.body);
    res.json(this.#dto(req, await this.eventosService.quitarMultimedia(id, ruta, req.user)));
  }

  async agregarTipoEntrada(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const tipo = tipoEntradaSchema.parse(req.body);
    res
      .status(201)
      .json(this.#dto(req, await this.eventosService.agregarTipoEntrada(id, tipo, req.user)));
  }

  async cancelar(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const { motivo } = cancelacionSchema.parse(req.body);
    const { vista, comprasResueltas } = await this.eventosService.cancelar(id, motivo, req.user);
    res.json({ ...this.#dto(req, vista), comprasResueltas });
  }

  async ampliarDescripcion(req, res) {
    const { id } = idParamSchema.parse(req.params);
    const { texto } = ampliacionSchema.parse(req.body);
    res
      .status(201)
      .json(this.#dto(req, await this.eventosService.ampliarDescripcion(id, texto, req.user)));
  }
}
