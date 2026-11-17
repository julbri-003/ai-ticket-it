import mongoose from "mongoose";
import { TipoMultimedia } from "../domain/eventoDominio.js";
import { persistiblePlugin } from "./persistibleSchema.js";

const { ObjectId } = mongoose.Schema.Types;

// Subdocumento con _id propio: las compras referencian el tipo de entrada por id.
export const TipoEntradaSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  descripcion: { type: String, default: "", trim: true },
  precio: { type: Number, required: true, min: 0.01 },
  cupo: { type: Number, required: true, min: 1 },
  disponibles: { type: Number, required: true, min: 0 },
});

const AmpliacionDescripcionSchema = new mongoose.Schema(
  {
    texto: { type: String, required: true, trim: true },
    fecha: { type: Date, required: true },
  },
  { _id: false },
);

const MultimediaSchema = new mongoose.Schema(
  {
    ruta: { type: String, required: true, trim: true },
    tipo: { type: String, enum: Object.values(TipoMultimedia), required: true },
    alt: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const EventoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    ampliacionesDescripcion: { type: [AmpliacionDescripcionSchema], default: [] },
    categoriaId: { type: ObjectId, ref: "Categoria", required: true },
    fecha: { type: Date, required: true },
    lugar: { type: String, required: true, trim: true },
    tiposEntrada: {
      type: [TipoEntradaSchema],
      validate: [(tipos) => tipos.length > 0, "El evento debe tener al menos un tipo de entrada"],
    },
    multimedia: { type: [MultimediaSchema], default: [] },
    organizadorId: { type: ObjectId, ref: "Usuario", required: true },
    // nombre + descripción + ampliaciones + lugar, en minúsculas y sin acentos (búsqueda parcial).
    textoBusqueda: { type: String, default: "" },
  },
  { timestamps: true, collection: "eventos" },
);

EventoSchema.index(
  { nombre: "text", descripcion: "text" },
  { default_language: "spanish", name: "texto_nombre_descripcion" },
);
EventoSchema.index({ categoriaId: 1, fecha: 1 });
EventoSchema.index({ organizadorId: 1, fecha: -1 });
EventoSchema.index({ activo: 1, fecha: 1 });

EventoSchema.plugin(persistiblePlugin);

export const EventoModel = mongoose.models.Evento ?? mongoose.model("Evento", EventoSchema);
