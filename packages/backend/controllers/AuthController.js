import { z } from "zod";
import { Roles } from "../domain/rolesDominio.js";
import { usuarioToDTO } from "./dto/usuarioDTO.js";

export const registroSchema = z
  .object({
    nombre: z.string().trim().min(1, "El nombre es obligatorio").max(60),
    apellido: z.string().trim().min(1, "El apellido es obligatorio").max(60),
    email: z.string().trim().toLowerCase().pipe(z.email("El formato del email es inválido")),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña admite como máximo 72 caracteres"),
    rol: z.enum([Roles.COMPRADOR, Roles.ORGANIZADOR], {
      error: "El rol debe ser COMPRADOR u ORGANIZADOR",
    }),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().pipe(z.email("El formato del email es inválido")),
    password: z.string().min(1, "La contraseña es obligatoria"),
  })
  .strict();

const sesionToDTO = ({ token, usuario }) => ({ token, usuario: usuarioToDTO(usuario) });

export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  async registrar(req, res) {
    const datos = registroSchema.parse(req.body);
    res.status(201).json(sesionToDTO(await this.authService.registrar(datos)));
  }

  async login(req, res) {
    const { email, password } = loginSchema.parse(req.body);
    res.json(sesionToDTO(await this.authService.login(email, password)));
  }

  async me(req, res) {
    res.json(usuarioToDTO(await this.authService.obtenerActual(req.user)));
  }
}
