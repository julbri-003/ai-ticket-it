import mongoose from "mongoose";
import { EstadoCompra, MotivoCancelacion } from "../domain/estadoCompraDominio.js";
import { persistiblePlugin } from "./persistibleSchema.js";

const { ObjectId } = mongoose.Schema.Types;

const CambioEstadoSchema = new mongoose.Schema(
  {
    estadoAnterior: { type: String, enum: [...Object.values(EstadoCompra), null], default: null },
    estadoNuevo: { type: String, enum: Object.values(EstadoCompra), required: true },
    quien: {
      id: { type: String, required: true },
      nombre: { type: String, required: true },
      rol: { type: String, required: true },
    },
    fechaHora: { type: Date, required: true },
    detalle: { type: String, default: "" },
  },
  { _id: false },
);

// Con _id: cada mensaje del chat tiene identidad propia.
const MensajeSchema = new mongoose.Schema({
  usuarioId: { type: String, required: true },
  usuarioNombre: { type: String, required: true },
  rol: { type: String, required: true },
  mensaje: { type: String, required: true, trim: true, maxlength: 1000 },
  enviado: { type: Date, required: true },
});

const CompraSchema = new mongoose.Schema(
  {
    compradorId: { type: ObjectId, ref: "Usuario", required: true },
    eventoId: { type: ObjectId, ref: "Evento", required: true },
    organizadorId: { type: ObjectId, ref: "Usuario", required: true },
    tipoEntradaId: { type: ObjectId, required: true },
    tipoEntradaNombre: { type: String, required: true },
    precioUnitario: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1, max: 10 },
    total: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: Object.values(EstadoCompra), required: true },
    historial: { type: [CambioEstadoSchema], default: [] },
    mensajes: { type: [MensajeSchema], default: [] },
    fechaCompra: { type: Date, required: true },
    fechaLimitePago: { type: Date, required: true },
    motivoCancelacion: {
      type: String,
      enum: [...Object.values(MotivoCancelacion), null],
      default: null,
    },
    reembolsoPendiente: { type: Boolean, default: false },
    fechaLimiteReembolso: { type: Date, default: null },
    reseniaId: { type: ObjectId, ref: "Resenia", default: null },
  },
  { timestamps: true, collection: "compras" },
);

CompraSchema.index({ compradorId: 1, estado: 1 });
CompraSchema.index({ eventoId: 1 });
CompraSchema.index({ estado: 1, fechaLimitePago: 1 });
CompraSchema.index({ estado: 1, fechaLimiteReembolso: 1 });

CompraSchema.plugin(persistiblePlugin);

export const CompraModel = mongoose.models.Compra ?? mongoose.model("Compra", CompraSchema);
