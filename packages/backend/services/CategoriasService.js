export class CategoriasService {
  constructor({ categoriasRepository }) {
    this.categoriasRepository = categoriasRepository;
  }

  async listar() {
    return this.categoriasRepository.listar();
  }
}
