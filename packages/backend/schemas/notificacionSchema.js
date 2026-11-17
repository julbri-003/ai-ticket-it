import mongoose from "mongoose";
import { persistiblePlugin } from "./persistibleSchema.js";

const { ObjectId } = mongoose.Schema.Types;

const NotificacionSchema = new mongoose.Schema(
  {
    destinatarioId: { type: ObjectId, ref: "Usuario", required: true },
    tipo: { type: String, required: true },
    titulo: { type: String, required: true },
    mensaje: { type: String, required: true },
    datos: {
      compraId: { type: ObjectId, ref: "Compra", default: undefined },
      eventoId: { type: ObjectId, ref: "Evento", default: undefined },
    },
    fecha: { type: Date, required: true },
    leida: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "notificaciones" },
);

NotificacionSchema.index({ destinatarioId: 1, leida: 1, fecha: -1 });

NotificacionSchema.plugin(persistiblePlugin);

export const NotificacionModel =
  mongoose.models.Notificacion ?? mongoose.model("Notificacion", NotificacionSchema);
