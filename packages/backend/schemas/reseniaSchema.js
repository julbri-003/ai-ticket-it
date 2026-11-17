import mongoose from "mongoose";
import { persistiblePlugin } from "./persistibleSchema.js";

const { ObjectId } = mongoose.Schema.Types;

const ReseniaSchema = new mongoose.Schema(
  {
    compraId: { type: ObjectId, ref: "Compra", required: true },
    compradorId: { type: ObjectId, ref: "Usuario", required: true },
    compradorNombre: { type: String, required: true, trim: true },
    eventoId: { type: ObjectId, ref: "Evento", required: true },
    organizadorId: { type: ObjectId, ref: "Usuario", required: true },
    tipoEntradaNombre: { type: String, required: true },
    puntuacion: { type: Number, required: true, min: 1, max: 5 },
    detalle: { type: String, default: "", trim: true, maxlength: 1000 },
    fecha: { type: Date, required: true },
  },
  { timestamps: true, collection: "resenias" },
);

// Una reseña por compra: refuerza en la base la regla del dominio.
ReseniaSchema.index({ compraId: 1 }, { unique: true });
ReseniaSchema.index({ organizadorId: 1, fecha: -1 });
ReseniaSchema.index({ eventoId: 1, fecha: -1 });

ReseniaSchema.plugin(persistiblePlugin);

export const ReseniaModel = mongoose.models.Resenia ?? mongoose.model("Resenia", ReseniaSchema);
