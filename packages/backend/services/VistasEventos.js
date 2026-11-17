import { Roles } from "../domain/rolesDominio.js";

/**
 * Junta lo que un evento necesita para mostrarse (categoría, organizador y, con sesión de
 * comprador, si es favorito) con pocas consultas, sin importar cuántos eventos sean.
 * Devuelve "vistas" { evento, categoria, organizador, esFavorito? } que el controller pasa al DTO.
 */
export class VistasEventos {
  constructor({ categoriasRepository, usuariosRepository }) {
    this.categoriasRepository = categoriasRepository;
    this.usuariosRepository = usuariosRepository;
  }

  async armar(eventos, usuarioSesion, { favoritos } = {}) {
    const [categorias, organizadores, idsFavoritos] = await Promise.all([
      this.categoriasRepository.listar(),
      this.usuariosRepository.obtenerVarios(eventos.map((e) => e.organizadorId)),
      favoritos ?? this.#favoritosDe(usuarioSesion),
    ]);
    const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
    const organizadorPorId = new Map(organizadores.map((o) => [o.id, o]));
    const setFavoritos = idsFavoritos ? new Set(idsFavoritos.map(String)) : null;

    return eventos.map((evento) => ({
      evento,
      categoria: categoriaPorId.get(String(evento.categoriaId)) ?? null,
      organizador: organizadorPorId.get(String(evento.organizadorId)) ?? null,
      ...(setFavoritos && { esFavorito: setFavoritos.has(String(evento.id)) }),
    }));
  }

  async armarUna(evento, usuarioSesion) {
    const [vista] = await this.armar([evento], usuarioSesion);
    return vista;
  }

  /** null si no hay sesión de comprador (entonces el DTO no incluye esFavorito). */
  async #favoritosDe(usuarioSesion) {
    if (usuarioSesion?.rol !== Roles.COMPRADOR) return null;
    const usuario = await this.usuariosRepository.obtenerPorId(usuarioSesion.id);
    return usuario?.favoritos ?? [];
  }
}
