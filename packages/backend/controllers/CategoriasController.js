import { categoriaToDTO } from "./dto/categoriaDTO.js";

export class CategoriasController {
  constructor(categoriasService) {
    this.categoriasService = categoriasService;
  }

  async listar(req, res) {
    res.json((await this.categoriasService.listar()).map(categoriaToDTO));
  }
}
