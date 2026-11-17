import { NotFoundError } from "../errors/AppError.js";

export class ReseniasService {
  constructor({ reseniasRepository, eventosRepository, usuariosRepository }) {
    this.reseniasRepository = reseniasRepository;
    this.eventosRepository = eventosRepository;
    this.usuariosRepository = usuariosRepository;
  }

  /**
   * Caso de uso 10: reseñas de TODOS los eventos del organizador del evento indicado,
   * paginadas, cada una con el evento al que pertenece.
   */
  async listarPorOrganizadorDelEvento(eventoId, paginado = {}) {
    const evento = await this.eventosRepository.obtenerPorId(eventoId, { incluirInactivos: true });
    if (!evento) {
      throw new NotFoundError("No existe el evento indicado");
    }
    const [resultado, [organizador]] = await Promise.all([
      this.reseniasRepository.listarPorOrganizador(evento.organizadorId, paginado),
      this.usuariosRepository.obtenerVarios([evento.organizadorId]),
    ]);
    const eventos = await this.eventosRepository.obtenerVarios(
      resultado.items.map((r) => r.eventoId),
    );
    const eventoPorId = new Map(eventos.map((e) => [e.id, e]));
    return {
      ...resultado,
      organizador,
      items: resultado.items.map((resenia) => ({
        resenia,
        evento: eventoPorId.get(resenia.eventoId) ?? null,
      })),
    };
  }
}
