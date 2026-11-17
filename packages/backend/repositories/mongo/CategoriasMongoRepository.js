import { Categoria } from "../../domain/categoriaDominio.js";
import { CategoriaModel } from "../../schemas/categoriaSchema.js";
import { escaparRegex } from "../../utils/normalizar.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, plano } from "./ids.js";

export class CategoriasMongoRepository extends RepositorioMongoPersistible {
  constructor() {
    super();
    this.model = CategoriaModel;
  }

  mapearCampos(categoria) {
    return { nombre: categoria.nombre, descripcion: categoria.descripcion };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    return new Categoria({ ...datos, id: aIdDominio(datos._id) });
  }

  async listar() {
    const docs = await this.model.find().sort({ nombre: 1 }).lean();
    return docs.map((doc) => this.hidratar(doc));
  }

  async obtenerPorNombre(nombre, { incluirInactivos = false } = {}) {
    const consulta = this.model.findOne({
      nombre: new RegExp(`^${escaparRegex(nombre.trim())}$`, "i"),
    });
    if (incluirInactivos) consulta.incluirInactivos();
    return this.hidratar(await consulta.lean());
  }
}
