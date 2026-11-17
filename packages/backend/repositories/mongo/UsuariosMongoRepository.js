import { Usuario } from "../../domain/usuarioDominio.js";
import { UsuarioModel } from "../../schemas/usuarioSchema.js";
import { ConflictError } from "../../errors/AppError.js";
import { normalizarTexto } from "../../utils/normalizar.js";
import { RepositorioMongoPersistible } from "./RepositorioMongoPersistible.js";
import { aIdDominio, aObjectId, esDuplicado, esIdValido, plano } from "./ids.js";

export class UsuariosMongoRepository extends RepositorioMongoPersistible {
  constructor() {
    super();
    this.model = UsuarioModel;
  }

  mapearCampos(usuario) {
    return {
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      passwordHash: usuario.passwordHash,
      rol: usuario.rol,
      favoritos: (usuario.favoritos ?? []).map(aObjectId),
      puntajePromedio: usuario.puntajePromedio ?? 0,
      cantidadResenias: usuario.cantidadResenias ?? 0,
      nombreBusqueda: normalizarTexto(`${usuario.nombre} ${usuario.apellido}`),
    };
  }

  hidratar(doc) {
    if (!doc) return null;
    const datos = plano(doc);
    return new Usuario({
      ...datos,
      id: aIdDominio(datos._id),
      favoritos: (datos.favoritos ?? []).map(aIdDominio),
    });
  }

  async guardar(usuario) {
    try {
      return await super.guardar(usuario);
    } catch (error) {
      if (esDuplicado(error)) {
        throw new ConflictError("Ya existe un usuario registrado con ese email");
      }
      throw error;
    }
  }

  /** Guarda solo si en la base sigue cumpliendo `condicion` (control optimista). null si no. */
  async guardarSi(usuario, condicion) {
    const doc = await this.model.findOneAndUpdate(
      { _id: usuario.id, ...condicion },
      { $set: this.mapearParaPersistir(usuario) },
      { new: true, runValidators: true },
    );
    return this.hidratar(doc);
  }

  async obtenerPorEmail(email, { incluirInactivos = false } = {}) {
    if (typeof email !== "string") return null;
    const consulta = this.model.findOne({ email: email.trim().toLowerCase() });
    if (incluirInactivos) consulta.incluirInactivos();
    return this.hidratar(await consulta.lean());
  }

  /** Varios usuarios por id (incluye inactivos: se usan para mostrar nombres históricos). */
  async obtenerVarios(ids = []) {
    const validos = [...new Set(ids.map(String))].filter(esIdValido);
    if (validos.length === 0) return [];
    const docs = await this.model
      .find({ _id: { $in: validos } })
      .incluirInactivos()
      .lean();
    return docs.map((doc) => this.hidratar(doc));
  }
}
