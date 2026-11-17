import { comprasApi } from "./apis/comprasApi";
import { ETIQUETAS_ESTADO } from "../utils/estadosCompra";
import { diaHoraTexto, diasRestantesTexto, fechaHoraTexto } from "../utils/fechas";
import { montoTexto } from "../utils/montos";

const ROL_A_QUIEN = { COMPRADOR: "Comprador", ORGANIZADOR: "Organizador", SISTEMA: "Sistema" };

function aEventoDeCompra(dto) {
  return {
    id: dto.id,
    nombre: dto.nombre,
    fecha: dto.fecha,
    fechaTexto: fechaHoraTexto(dto.fecha),
    lugar: dto.lugar,
    imagen: dto.imagen ? { uri: dto.imagen.url, alt: dto.imagen.alt } : null,
    yaOcurrio: dto.yaOcurrio,
  };
}

/** DTO de compra (lista o detalle) → modelo de UI. */
export function aCompra(dto) {
  const acciones = dto.acciones ?? {
    puedePagar: dto.puedePagar,
    puedeCancelar: dto.puedeCancelar,
    puedeReseniar: dto.puedeReseniar,
    puedeReembolsar: false,
  };
  return {
    id: dto.id,
    evento: aEventoDeCompra(dto.evento),
    tipoEntrada: dto.tipoEntrada.nombre,
    cantidad: dto.cantidad,
    precioUnitario: dto.precioUnitario,
    precioUnitarioTexto: montoTexto(dto.precioUnitario),
    total: dto.total,
    totalTexto: montoTexto(dto.total),
    estado: dto.estado,
    estadoTexto: ETIQUETAS_ESTADO[dto.estado] ?? dto.estado,
    motivoCancelacion: dto.motivoCancelacion,
    vencida: dto.motivoCancelacion === "VENCIDA",
    fechaCompraTexto: diaHoraTexto(dto.fechaCompra),
    diasParaElEvento: dto.diasParaElEvento,
    diasTexto: dto.estado === "CONFIRMADA" ? diasRestantesTexto(dto.diasParaElEvento) : null,
    fechaLimitePago: dto.fechaLimitePago,
    fechaLimitePagoTexto: dto.fechaLimitePago ? diaHoraTexto(dto.fechaLimitePago) : null,
    reembolsoPendiente: dto.reembolsoPendiente,
    fechaLimiteReembolsoTexto: dto.fechaLimiteReembolso
      ? diaHoraTexto(dto.fechaLimiteReembolso)
      : null,
    acciones,
    mensajesNoLeidos: dto.mensajesNoLeidos ?? 0,
  };
}

/** Detalle: agrega historial (timeline) y reseña. `usuarioId` para mostrar "Vos". */
export function aCompraDetalle(dto, usuarioId) {
  return {
    ...aCompra(dto),
    historial: (dto.historial ?? []).map((c, i) => ({
      id: `${i}-${c.fechaHora}`,
      estado: c.estadoNuevo,
      estadoTexto: ETIQUETAS_ESTADO[c.estadoNuevo] ?? c.estadoNuevo,
      fechaTexto: diaHoraTexto(c.fechaHora),
      quienTexto: c.quien.id === usuarioId ? "Vos" : (ROL_A_QUIEN[c.quien.rol] ?? c.quien.nombre),
      detalle: c.detalle,
    })),
    resenia: dto.resenia
      ? { puntuacion: dto.resenia.puntuacion, detalle: dto.resenia.detalle }
      : null,
  };
}

export const FILTROS_ESTADO = [
  { valor: null, etiqueta: "Todas" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "CONFIRMADA", etiqueta: "Confirmadas" },
  { valor: "UTILIZADA", etiqueta: "Utilizadas" },
  { valor: "CANCELADA", etiqueta: "Canceladas" },
  { valor: "REEMBOLSADA", etiqueta: "Reembolsadas" },
];

export const comprasService = {
  async mias() {
    return (await comprasApi.mias()).map(aCompra);
  },
  async detalle(id, usuarioId) {
    return aCompraDetalle(await comprasApi.detalle(id), usuarioId);
  },
  async crear({ eventoId, tipoEntradaId, cantidad }, usuarioId) {
    return aCompraDetalle(await comprasApi.crear({ eventoId, tipoEntradaId, cantidad }), usuarioId);
  },
  async pagar(id, usuarioId) {
    return aCompraDetalle(await comprasApi.pagar(id), usuarioId);
  },
  async cancelar(id, usuarioId) {
    return aCompraDetalle(await comprasApi.cancelar(id), usuarioId);
  },
  async reseniar(id, { puntuacion, detalle }) {
    return comprasApi.reseniar(id, {
      puntuacion,
      ...(detalle?.trim() ? { detalle: detalle.trim() } : {}),
    });
  },
};

export default comprasService;
