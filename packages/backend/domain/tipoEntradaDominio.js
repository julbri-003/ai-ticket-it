import { BadRequestError, ConflictError } from "../errors/AppError.js";
import { redondearMonto } from "../utils/montos.js";
import { textoObligatorio, textoOpcional } from "./validaciones.js";

function esCantidadValida(cantidad) {
  return Number.isInteger(cantidad) && cantidad > 0;
}

function exigirCantidadValida(cantidad) {
  if (!esCantidadValida(cantidad)) {
    throw new BadRequestError("La cantidad debe ser un número entero mayor a 0");
  }
}

export class TipoEntrada {
  constructor({ id = null, nombre, descripcion = "", precio, cupo, disponibles }) {
    if (typeof precio !== "number" || !Number.isFinite(precio) || precio <= 0) {
      throw new BadRequestError("El precio del tipo de entrada debe ser mayor a 0");
    }
    if (!esCantidadValida(cupo)) {
      throw new BadRequestError("El cupo del tipo de entrada debe ser un entero mayor a 0");
    }
    const disponiblesIniciales = disponibles ?? cupo;
    if (
      !Number.isInteger(disponiblesIniciales) ||
      disponiblesIniciales < 0 ||
      disponiblesIniciales > cupo
    ) {
      throw new BadRequestError("Las entradas disponibles deben estar entre 0 y el cupo");
    }

    this.id = id;
    this.nombre = textoObligatorio(nombre, "El tipo de entrada debe tener un nombre");
    this.descripcion = textoOpcional(descripcion, { campo: "La descripción", max: 500 });
    this.precio = redondearMonto(precio);
    this.cupo = cupo;
    this.disponibles = disponiblesIniciales;
  }

  get vendidas() {
    return this.cupo - this.disponibles;
  }

  hayCupoPara(cantidad) {
    return esCantidadValida(cantidad) && cantidad <= this.disponibles;
  }

  reservar(cantidad) {
    exigirCantidadValida(cantidad);
    if (!this.hayCupoPara(cantidad)) {
      throw new ConflictError(
        `No hay cupo suficiente para "${this.nombre}": quedan ${this.disponibles} entradas`,
      );
    }
    this.disponibles -= cantidad;
  }

  /** Devuelve entradas al cupo. Nunca supera el cupo total. */
  liberar(cantidad) {
    exigirCantidadValida(cantidad);
    this.disponibles = Math.min(this.cupo, this.disponibles + cantidad);
  }

  toJSON() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      precio: this.precio,
      cupo: this.cupo,
      disponibles: this.disponibles,
      vendidas: this.vendidas,
    };
  }
}
