const incluirInactivos = Symbol("incluirInactivos");

/**
 * Campos compartidos para esquemas raíz o subdocumentos de entidades Persistible.
 * Aplicar con schema.plugin(persistiblePlugin) antes de crear el modelo.
 * La herencia de dominio por sí sola no define campos de Mongoose.
 * Las búsquedas y conteos incluyen únicamente activo=true por defecto.
 * Usar consulta.incluirInactivos() para recuperar también registros dados de baja.
 * Las actualizaciones no se filtran, para permitir guardar bajas y reactivaciones.
 * No filtra agregaciones ni elementos dentro de arrays de subdocumentos.
 */
export function persistiblePlugin(schema) {
  schema.add({
    activo: { type: Boolean, default: true, required: true },
    fechaModificacion: { type: Date, default: null },
    modificadoPor: { type: String, default: null },
  });

  schema.pre(["find", "findOne", "countDocuments"], function (next) {
    if (!this[incluirInactivos]) {
      this.and([{ activo: true }]);
    }
    next();
  });

  schema.query.incluirInactivos = function () {
    this[incluirInactivos] = true;
    return this;
  };
}
