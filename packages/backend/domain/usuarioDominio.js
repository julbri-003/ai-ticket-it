import { BadRequestError, ForbiddenError } from "../errors/AppError.js";
import { mismoId } from "../utils/id.js";
import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import { Roles, esRolValido } from "./rolesDominio.js";
import { idObligatorio, textoObligatorio, validarPuntuacion } from "./validaciones.js";

// Fuera de la clase (no #privado): los documentos de mongoose cargados con loadClass
// no son instancias reales y no pueden acceder a miembros #privados.
function exigirComprador(usuario) {
  if (!usuario.esComprador()) {
    throw new ForbiddenError("Solo los compradores pueden tener favoritos");
  }
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Usuario extends Persistible {
  constructor({
    id = null,
    nombre,
    apellido,
    email,
    passwordHash,
    rol,
    favoritos = [],
    puntajePromedio = 0,
    cantidadResenias = 0,
    activo,
    fechaModificacion,
    modificadoPor,
  }) {
    super();
    if (typeof email !== "string" || !EMAIL_VALIDO.test(email.trim())) {
      throw new BadRequestError("El usuario debe tener un email válido");
    }
    if (!passwordHash) {
      throw new BadRequestError("La contraseña es obligatoria");
    }
    if (!esRolValido(rol)) {
      throw new BadRequestError("El rol debe ser COMPRADOR u ORGANIZADOR");
    }

    this.id = id;
    this.nombre = textoObligatorio(nombre, "El nombre es obligatorio");
    this.apellido = textoObligatorio(apellido, "El apellido es obligatorio");
    this.email = email.trim().toLowerCase();
    this.passwordHash = passwordHash;
    this.rol = rol;
    this.favoritos = rol === Roles.COMPRADOR ? [...favoritos] : [];

    // El puntaje solo tiene sentido para organizadores.
    if (rol === Roles.ORGANIZADOR) {
      this.puntajePromedio = puntajePromedio;
      this.cantidadResenias = cantidadResenias;
    }

    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellido}`;
  }

  esComprador() {
    return this.rol === Roles.COMPRADOR;
  }

  esOrganizador() {
    return this.rol === Roles.ORGANIZADOR;
  }

  esFavorito(eventoId) {
    return this.favoritos.some((id) => mismoId(id, eventoId));
  }

  /** Idempotente: agregar un favorito que ya está no lo duplica. */
  agregarFavorito(eventoId) {
    exigirComprador(this);
    idObligatorio(eventoId, "El evento es obligatorio");
    if (!this.esFavorito(eventoId)) {
      this.favoritos.push(eventoId);
    }
  }

  quitarFavorito(eventoId) {
    exigirComprador(this);
    this.favoritos = this.favoritos.filter((id) => !mismoId(id, eventoId));
  }

  /** Recalcula el promedio de forma incremental con la nueva puntuación. */
  registrarResenia(puntuacion) {
    if (!this.esOrganizador()) {
      throw new ForbiddenError("Solo los organizadores reciben reseñas");
    }
    validarPuntuacion(puntuacion);
    const total = this.puntajePromedio * this.cantidadResenias + puntuacion;
    this.cantidadResenias += 1;
    this.puntajePromedio = total / this.cantidadResenias;
  }

  toJSON() {
    const json = {
      id: this.id,
      nombre: this.nombre,
      apellido: this.apellido,
      email: this.email,
      rol: this.rol,
      activo: this.activo,
    };
    if (this.esComprador()) json.favoritos = this.favoritos;
    if (this.esOrganizador()) {
      json.puntajePromedio = this.puntajePromedio;
      json.cantidadResenias = this.cantidadResenias;
    }
    return json;
  }
}
