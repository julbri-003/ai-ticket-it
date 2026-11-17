import { NotFoundError, UnauthorizedError } from "../errors/AppError.js";

export class FavoritosService {
  constructor({ usuariosRepository, eventosRepository, vistasEventos }) {
    this.usuariosRepository = usuariosRepository;
    this.eventosRepository = eventosRepository;
    this.vistasEventos = vistasEventos;
  }

  /** Eventos favoritos, incluso los anteriores, en el orden en que se marcaron (último primero). */
  async listar(usuarioSesion) {
    const usuario = await this.#usuario(usuarioSesion);
    const eventos = await this.eventosRepository.obtenerVarios(usuario.favoritos);
    const porId = new Map(eventos.map((e) => [e.id, e]));
    const enOrden = [...usuario.favoritos]
      .reverse()
      .map((id) => porId.get(String(id)))
      .filter(Boolean);
    return this.vistasEventos.armar(enOrden, usuarioSesion, { favoritos: usuario.favoritos });
  }

  /** Idempotente. Se puede marcar un evento finalizado; uno inexistente → 404. */
  async agregar(usuarioSesion, eventoId) {
    const usuario = await this.#usuario(usuarioSesion);
    const evento = await this.eventosRepository.obtenerPorId(eventoId, { incluirInactivos: true });
    if (!evento) {
      throw new NotFoundError("No existe el evento indicado");
    }
    usuario.agregarFavorito(evento.id);
    return (await this.usuariosRepository.guardar(usuario)).favoritos;
  }

  /** Idempotente: quitar un evento que no estaba (o que no existe) no es error. */
  async quitar(usuarioSesion, eventoId) {
    const usuario = await this.#usuario(usuarioSesion);
    usuario.quitarFavorito(eventoId);
    return (await this.usuariosRepository.guardar(usuario)).favoritos;
  }

  async #usuario(usuarioSesion) {
    const usuario = await this.usuariosRepository.obtenerPorId(usuarioSesion?.id);
    if (!usuario) {
      throw new UnauthorizedError("La sesión ya no es válida");
    }
    return usuario;
  }
}
