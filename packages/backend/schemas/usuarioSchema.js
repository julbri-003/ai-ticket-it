import mongoose from "mongoose";
import { Roles } from "../domain/rolesDominio.js";
import { persistiblePlugin } from "./persistibleSchema.js";

const { ObjectId } = mongoose.Schema.Types;

const UsuarioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    rol: { type: String, enum: Object.values(Roles), required: true },
    favoritos: { type: [{ type: ObjectId, ref: "Evento" }], default: [] },
    puntajePromedio: { type: Number, default: 0, min: 0, max: 5 },
    cantidadResenias: { type: Number, default: 0, min: 0 },
    // "nombre apellido" en minúsculas y sin acentos, para buscar eventos por organizador.
    nombreBusqueda: { type: String, default: "" },
  },
  { timestamps: true, collection: "usuarios" },
);

UsuarioSchema.index({ email: 1 }, { unique: true });
UsuarioSchema.index({ rol: 1, nombreBusqueda: 1 });

UsuarioSchema.plugin(persistiblePlugin);

export const UsuarioModel = mongoose.models.Usuario ?? mongoose.model("Usuario", UsuarioSchema);
