import { EstadoCompra } from "../domain/estadoCompraDominio.js";
import { categoriasPreferidas } from "../domain/recomendacionDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import { OrdenEventos } from "../repositories/mongo/EventosMongoRepository.js";

function listaConY(nombres) {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** "Recomendados para vos": categorías preferidas según los favoritos del comprador. */
export class RecomendacionesService {
  constructor({
    usuariosRepository,
    eventosRepository,
    comprasRepository,
    categoriasRepository,
    vistasEventos,
  }) {
    this.usuariosRepository = usuariosRepository;
    this.eventosRepository = eventosRepository;
    this.comprasRepository = comprasRepository;
    this.categoriasRepository = categoriasRepository;
    this.vistasEventos = vistasEventos;
  }

  /**
   * { usuario, preferidas: [{ categoriaId, cantidad, peso }] } del comprador. Cuenta también los
   * favoritos de eventos finalizados y respeta el orden en que se marcaron (desempate).
   * Para quien no es comprador, preferidas = [].
   */
  async preferenciasDe(usuarioSesion) {
    if (usuarioSesion?.rol !== Roles.COMPRADOR) return { usuario: null, preferidas: [] };
    const usuario = await this.usuariosRepository.obtenerPorId(usuarioSesion.id);
    if (!usuario || usuario.favoritos.length === 0) return { usuario, preferidas: [] };

    const eventos = await this.eventosRepository.obtenerVarios(usuario.favoritos);
    const porId = new Map(eventos.map((e) => [e.id, e]));
    const enOrden = usuario.favoritos.map((id) => porId.get(String(id))).filter(Boolean);
    return { usuario, preferidas: categoriasPreferidas(enOrden) };
  }

  async recomendados(usuarioSesion, { pagina = 1, limite = 10 } = {}) {
    const { usuario, preferidas } = await this.preferenciasDe(usuarioSesion);
    if (preferidas.length === 0) {
      return {
        items: [],
        total: 0,
        pagina,
        limite,
        categorias: [],
        motivo: null,
        sinFavoritos: true,
      };
    }

    const comprados = await this.comprasRepository.listarEventosComprados(usuario.id, [
      EstadoCompra.CONFIRMADA,
      EstadoCompra.PENDIENTE,
    ]);
    const resultado = await this.eventosRepository.buscar({
      categoriaIds: preferidas.map((p) => p.categoriaId),
      pesosCategorias: preferidas,
      excluirIds: [...usuario.favoritos, ...comprados],
      orden: OrdenEventos.RELEVANCIA,
      pagina,
      limite,
    });

    const categorias = await this.#categoriasConNombre(preferidas);
    return {
      ...resultado,
      items: await this.vistasEventos.armar(resultado.items, usuarioSesion, {
        favoritos: usuario.favoritos,
      }),
      categorias,
      motivo: `Porque guardaste eventos de ${listaConY(categorias.map((c) => c.nombre))}`,
      sinFavoritos: false,
    };
  }

  async #categoriasConNombre(preferidas) {
    const todas = await this.categoriasRepository.listar();
    const porId = new Map(todas.map((c) => [c.id, c]));
    return preferidas.map((p) => ({
      id: p.categoriaId,
      nombre: porId.get(String(p.categoriaId))?.nombre ?? "",
      cantidad: p.cantidad,
    }));
  }
}
