import { baseUrlDe } from "./dto/urls.js";
import { eventoToDTO } from "./dto/eventoDTO.js";
import { eventoIdParamSchema } from "./validaciones.js";

export class FavoritosController {
  constructor({ favoritosService, reloj }) {
    this.favoritosService = favoritosService;
    this.reloj = reloj;
  }

  async listar(req, res) {
    const vistas = await this.favoritosService.listar(req.user);
    const baseUrl = baseUrlDe(req);
    res.json(
      vistas.map(({ evento, categoria, organizador, esFavorito }) =>
        eventoToDTO(evento, { reloj: this.reloj, baseUrl, categoria, organizador, esFavorito }),
      ),
    );
  }

  async agregar(req, res) {
    const { eventoId } = eventoIdParamSchema.parse(req.params);
    res.json({ favoritos: await this.favoritosService.agregar(req.user, eventoId) });
  }

  async quitar(req, res) {
    const { eventoId } = eventoIdParamSchema.parse(req.params);
    res.json({ favoritos: await this.favoritosService.quitar(req.user, eventoId) });
  }
}
