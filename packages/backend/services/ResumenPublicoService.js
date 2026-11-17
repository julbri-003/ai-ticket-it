import { Roles } from "../domain/rolesDominio.js";

/** Datos públicos de la landing: estadísticas generales y reseñas destacadas. */
export class ResumenPublicoService {
  constructor({ eventosRepository, usuariosRepository, reseniasRepository }) {
    this.eventosRepository = eventosRepository;
    this.usuariosRepository = usuariosRepository;
    this.reseniasRepository = reseniasRepository;
  }

  async obtener({ cantidadResenias = 6 } = {}) {
    const [eventos, organizadores, puntaje, destacadas] = await Promise.all([
      this.eventosRepository.estadisticas(),
      this.usuariosRepository.contarPorRol(Roles.ORGANIZADOR),
      this.reseniasRepository.promedioGeneral(),
      this.reseniasRepository.destacadas(cantidadResenias),
    ]);
    const eventosDeResenias = await this.eventosRepository.obtenerVarios(
      destacadas.map((r) => r.eventoId),
    );
    const eventoPorId = new Map(eventosDeResenias.map((e) => [e.id, e]));
    return {
      estadisticas: {
        ...eventos,
        organizadores,
        puntajePromedio: puntaje.promedio == null ? null : Math.round(puntaje.promedio * 10) / 10,
        cantidadResenias: puntaje.cantidad,
      },
      reseniasDestacadas: destacadas.map((resenia) => ({
        resenia,
        evento: eventoPorId.get(resenia.eventoId) ?? null,
      })),
    };
  }
}
