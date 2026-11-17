import mongoose from "mongoose";
import { persistiblePlugin } from "./persistibleSchema.js";

const CategoriaSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "categorias" },
);

CategoriaSchema.index({ nombre: 1 }, { unique: true });

CategoriaSchema.plugin(persistiblePlugin);

export const CategoriaModel =
  mongoose.models.Categoria ?? mongoose.model("Categoria", CategoriaSchema);
