import { z } from "zod";
import { notificacionToDTO } from "./dto/notificacionDTO.js";
import { booleanoQuery, objectId, paginadoSchema } from "./validaciones.js";

export const listarNotificacionesSchema = paginadoSchema.extend({
  soloNoLeidas: booleanoQuery.default(false),
});

export const notificacionParamSchema = z.object({ id: objectId("El id de la notificación") });
export const sinCuerpoSchema = z.object({}).strict();

export class NotificacionesController {
  constructor({ notificacionesService }) {
    this.notificacionesService = notificacionesService;
  }

  async listar(req, res) {
    const filtros = listarNotificacionesSchema.parse(req.query);
    const resultado = await this.notificacionesService.listar(req.user, filtros);
    res.json({ ...resultado, items: resultado.items.map(notificacionToDTO) });
  }

  async cantidadNoLeidas(req, res) {
    res.json({ cantidad: await this.notificacionesService.contarNoLeidas(req.user) });
  }

  async marcarLeida(req, res) {
    const { id } = notificacionParamSchema.parse(req.params);
    sinCuerpoSchema.parse(req.body ?? {});
    res.json(notificacionToDTO(await this.notificacionesService.marcarLeida(id, req.user)));
  }

  async limpiar(req, res) {
    sinCuerpoSchema.parse(req.body ?? {});
    res.json({ eliminadas: await this.notificacionesService.limpiar(req.user) });
  }

  async marcarTodasLeidas(req, res) {
    sinCuerpoSchema.parse(req.body ?? {});
    res.json({ actualizadas: await this.notificacionesService.marcarTodasLeidas(req.user) });
  }
}
