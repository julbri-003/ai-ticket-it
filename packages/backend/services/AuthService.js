import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Usuario } from "../domain/usuarioDominio.js";
import { ConflictError, UnauthorizedError } from "../errors/AppError.js";

const RONDAS_BCRYPT = 10;

export class AuthService {
  constructor({ usuariosRepository }) {
    this.usuariosRepository = usuariosRepository;
  }

  /** Alta de un comprador u organizador. Devuelve { token, usuario }. */
  async registrar({ nombre, apellido, email, password, rol }) {
    const existente = await this.usuariosRepository.obtenerPorEmail(email, {
      incluirInactivos: true,
    });
    if (existente) {
      throw new ConflictError("Ya existe un usuario registrado con ese email");
    }
    const passwordHash = await bcrypt.hash(password, RONDAS_BCRYPT);
    const usuario = await this.usuariosRepository.guardar(
      new Usuario({ nombre, apellido, email, passwordHash, rol }),
    );
    return { token: this.#generarToken(usuario), usuario };
  }

  /** Mismo mensaje para email inexistente y contraseña incorrecta (no revela qué falló). */
  async login(email, password) {
    const usuario = await this.usuariosRepository.obtenerPorEmail(email);
    const valida = usuario && (await bcrypt.compare(password, usuario.passwordHash));
    if (!valida) {
      throw new UnauthorizedError("Credenciales inválidas");
    }
    return { token: this.#generarToken(usuario), usuario };
  }

  /** Usuario de la sesión. Si fue dado de baja, la sesión deja de valer (401). */
  async obtenerActual(usuarioSesion) {
    const usuario = await this.usuariosRepository.obtenerPorId(usuarioSesion?.id);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida");
    }
    return usuario;
  }

  #generarToken(usuario) {
    return jwt.sign(
      { id: usuario.id, rol: usuario.rol, nombre: usuario.nombreCompleto },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );
  }
}
