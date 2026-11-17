import { Persistible, restaurarAuditoria } from "./persistibleDominio.js";
import { fechaValida, idObligatorio, textoObligatorio } from "./validaciones.js";

export class Notificacion extends Persistible {
  constructor({
    id = null,
    destinatarioId,
    tipo,
    titulo,
    mensaje,
    datos = {},
    fecha,
    leida = false,
    activo,
    fechaModificacion,
    modificadoPor,
  }) {
    super();
    this.id = id;
    this.destinatarioId = idObligatorio(destinatarioId, "La notificación debe tener destinatario");
    this.tipo = textoObligatorio(tipo, "La notificación debe tener un tipo");
    this.titulo = textoObligatorio(titulo, "La notificación debe tener un título");
    this.mensaje = textoObligatorio(mensaje, "La notificación debe tener un mensaje");
    // Referencias para navegar desde la notificación: { compraId?, eventoId? }.
    this.datos = { ...datos };
    this.fecha = fechaValida(fecha, "La notificación debe tener una fecha válida");
    this.leida = leida;
    restaurarAuditoria(this, { activo, fechaModificacion, modificadoPor });
  }

  marcarLeida() {
    this.leida = true;
  }
}
