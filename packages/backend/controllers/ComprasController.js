import { z } from "zod";
import { EstadoCompra } from "../domain/estadoCompraDominio.js";
import { MAX_ENTRADAS_POR_COMPRA } from "../domain/compraDominio.js";
import { compraDeEventoToDTO, compraDetalleToDTO, compraResumenToDTO } from "./dto/compraDTO.js";
import { reseniaToDTO } from "./dto/reseniaDTO.js";
import { baseUrlDe } from "./dto/urls.js";
import { eventoIdParamSchema, objectId } from "./validaciones.js";

export const crearCompraSchema = z
  .object({
    eventoId: objectId("El evento"),
    tipoEntradaId: objectId("El tipo de entrada"),
    cantidad: z
      .number({ error: "La cantidad debe ser un número" })
      .int("La cantidad debe ser un número entero")
      .min(1, "La cantidad mínima es 1")
      .max(MAX_ENTRADAS_POR_COMPRA, `La cantidad máxima es ${MAX_ENTRADAS_POR_COMPRA}`),
  })
  .strict();

export const filtroEstadoSchema = z.object({
  estado: z
    .enum(Object.values(EstadoCompra), {
      error: `estado debe ser ${Object.values(EstadoCompra).join(", ")}`,
    })
    .optional(),
});

export const reseniaSchema = z
  .object({
    puntuacion: z
      .number({ error: "La puntuación debe ser un número" })
      .min(1, "La puntuación mínima es 1")
      .max(5, "La puntuación máxima es 5")
      .refine((p) => Number.isInteger(p * 2), "La puntuación va en pasos de 0,5"),
    detalle: z
      .string()
      .trim()
      .max(1000, "El detalle admite como máximo 1000 caracteres")
      .optional(),
  })
  .strict();

/** pagar, cancelar y reembolsar no reciben datos: el body tiene que estar vacío. */
export const sinCuerpoSchema = z.object({}).strict();

export const compraIdParamSchema = z.object({ id: objectId("El id de la compra") });

export class ComprasController {
  constructor({ comprasService, reloj }) {
    this.comprasService = comprasService;
    this.reloj = reloj;
  }

  #detalle(req, { compra, evento, resenia }) {
    return compraDetalleToDTO(compra, evento, {
      reloj: this.reloj,
      baseUrl: baseUrlDe(req),
      usuarioId: req.user.id,
      resenia,
    });
  }

  async crear(req, res) {
    const datos = crearCompraSchema.parse(req.body);
    res.status(201).json(this.#detalle(req, await this.comprasService.crear(req.user, datos)));
  }

  async mias(req, res) {
    const { estado } = filtroEstadoSchema.parse(req.query);
    const items = await this.comprasService.listarMias(req.user, { estado });
    const contexto = { reloj: this.reloj, baseUrl: baseUrlDe(req), usuarioId: req.user.id };
    res.json(items.map(({ compra, evento }) => compraResumenToDTO(compra, evento, contexto)));
  }

  async detalle(req, res) {
    const { id } = compraIdParamSchema.parse(req.params);
    res.json(this.#detalle(req, await this.comprasService.detalle(id, req.user)));
  }

  async #accion(req, res, metodo) {
    const { id } = compraIdParamSchema.parse(req.params);
    sinCuerpoSchema.parse(req.body ?? {});
    await this.comprasService[metodo](id, req.user);
    // Se devuelve el detalle completo y al día (historial, acciones disponibles).
    res.json(this.#detalle(req, await this.comprasService.detalle(id, req.user)));
  }

  pagar(req, res) {
    return this.#accion(req, res, "pagar");
  }

  cancelar(req, res) {
    return this.#accion(req, res, "cancelar");
  }

  reembolsar(req, res) {
    return this.#accion(req, res, "reembolsar");
  }

  async reseniar(req, res) {
    const { id } = compraIdParamSchema.parse(req.params);
    const datos = reseniaSchema.parse(req.body);
    const { resenia, evento } = await this.comprasService.reseniar(id, req.user, datos);
    res.status(201).json(reseniaToDTO(resenia, { evento }));
  }

  async deEvento(req, res) {
    const { eventoId } = eventoIdParamSchema.parse(req.params);
    const { estado } = filtroEstadoSchema.parse(req.query);
    const { evento, resumen, compras } = await this.comprasService.resumenDeEvento(
      eventoId,
      req.user,
      {
        estado,
      },
    );
    res.json({
      evento: { id: evento.id, nombre: evento.nombre, fecha: evento.fecha },
      resumen,
      compras: compras.map(({ compra, comprador }) => compraDeEventoToDTO(compra, comprador)),
    });
  }
}
