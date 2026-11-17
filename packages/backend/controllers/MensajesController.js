import { z } from "zod";
import { MAX_CARACTERES_MENSAJE } from "../domain/mensajeDominio.js";
import { mensajeToDTO } from "./dto/mensajeDTO.js";
import { fechaIso, objectId } from "./validaciones.js";

export const compraParamSchema = z.object({ id: objectId("El id de la compra") });

export const listarMensajesSchema = z.object({
  // ISO con zona ("2026-11-20T15:00:00.000Z"): el front manda el "enviado" del último mensaje.
  desde: fechaIso.transform((v) => new Date(v)).optional(),
});

export const enviarMensajeSchema = z
  .object({
    mensaje: z
      .string({ error: "El mensaje debe ser un texto" })
      .trim()
      .min(1, "El mensaje no puede estar vacío")
      .max(
        MAX_CARACTERES_MENSAJE,
        `El mensaje admite como máximo ${MAX_CARACTERES_MENSAJE} caracteres`,
      ),
  })
  .strict();

export const sinCuerpoSchema = z.object({}).strict();

export class MensajesController {
  constructor({ mensajesService }) {
    this.mensajesService = mensajesService;
  }

  async listar(req, res) {
    const { id } = compraParamSchema.parse(req.params);
    const { desde } = listarMensajesSchema.parse(req.query);
    const { compra, mensajes } = await this.mensajesService.listar(id, req.user, { desde });
    res.json({
      mensajes: mensajes.map(mensajeToDTO),
      mensajesNoLeidos: compra.mensajesNoLeidosPara(req.user.id),
    });
  }

  async enviar(req, res) {
    const { id } = compraParamSchema.parse(req.params);
    const { mensaje } = enviarMensajeSchema.parse(req.body);
    res.status(201).json(mensajeToDTO(await this.mensajesService.enviar(id, req.user, mensaje)));
  }

  async marcarLeidos(req, res) {
    const { id } = compraParamSchema.parse(req.params);
    sinCuerpoSchema.parse(req.body ?? {});
    res.json(await this.mensajesService.marcarLeidos(id, req.user));
  }
}
