import { EstadoCompra } from "../../domain/estadoCompraDominio.js";
import { multimediaToDTO } from "./eventoDTO.js";
import { reseniaToDTO } from "./reseniaDTO.js";

function eventoResumenDTO(evento, { reloj, baseUrl }) {
  const imagen = evento.imagenPrincipal;
  return {
    id: evento.id,
    nombre: evento.nombre,
    fecha: evento.fecha,
    lugar: evento.lugar,
    ubicacion: evento.ubicacion ?? null,
    imagen: imagen ? multimediaToDTO(imagen, baseUrl) : null,
    yaOcurrio: evento.yaOcurrio(reloj),
  };
}

const puedeReembolsar = (compra) =>
  compra.estado === EstadoCompra.CANCELADA && compra.reembolsoPendiente;

/** Lo común a la lista y al detalle. */
function compraBaseDTO(compra, evento, { reloj, baseUrl }) {
  return {
    id: compra.id,
    evento: eventoResumenDTO(evento, { reloj, baseUrl }),
    tipoEntrada: { id: compra.tipoEntradaId, nombre: compra.tipoEntradaNombre },
    cantidad: compra.cantidad,
    precioUnitario: compra.precioUnitario,
    total: compra.total,
    estado: compra.estado,
    motivoCancelacion: compra.motivoCancelacion,
    fechaCompra: compra.fechaCompra,
    diasParaElEvento: compra.diasParaElEvento(evento.fecha, reloj),
    fechaLimitePago: compra.estado === EstadoCompra.PENDIENTE ? compra.fechaLimitePago : null,
    reembolsoPendiente: compra.reembolsoPendiente,
    fechaLimiteReembolso: compra.reembolsoPendiente ? compra.fechaLimiteReembolso : null,
  };
}

/** Ítem de "Mis compras" (vista del comprador). */
export function compraResumenToDTO(compra, evento, { reloj, baseUrl, usuarioId }) {
  return {
    ...compraBaseDTO(compra, evento, { reloj, baseUrl }),
    puedeCancelar: compra.puedeCancelar(evento.fecha, reloj),
    puedePagar: compra.puedePagar(reloj),
    puedeReseniar: compra.puedeReseniar(usuarioId),
    mensajesNoLeidos: compra.mensajesNoLeidosPara(usuarioId),
  };
}

/** Detalle con timeline, chat, reseña y las acciones que puede hacer quien mira. */
export function compraDetalleToDTO(compra, evento, { reloj, baseUrl, usuarioId, resenia }) {
  const esComprador = compra.esDe(usuarioId);
  return {
    ...compraBaseDTO(compra, evento, { reloj, baseUrl }),
    organizadorId: compra.organizadorId,
    historial: compra.historial.map(
      ({ estadoAnterior, estadoNuevo, quien, fechaHora, detalle }) => ({
        estadoAnterior,
        estadoNuevo,
        quien: { id: quien.id, nombre: quien.nombre, rol: quien.rol },
        fechaHora,
        detalle,
      }),
    ),
    mensajes: compra.mensajes.map(
      ({ id, usuarioId: autor, usuarioNombre, rol, mensaje, enviado }) => ({
        id,
        usuarioId: autor,
        usuarioNombre,
        rol,
        mensaje,
        enviado,
      }),
    ),
    mensajesNoLeidos: compra.mensajesNoLeidosPara(usuarioId),
    resenia: resenia ? reseniaToDTO(resenia, { evento }) : null,
    acciones: {
      puedePagar: esComprador && compra.puedePagar(reloj),
      puedeCancelar: esComprador && compra.puedeCancelar(evento.fecha, reloj),
      puedeReseniar: esComprador && compra.puedeReseniar(usuarioId),
      puedeReembolsar: !esComprador && puedeReembolsar(compra),
    },
  };
}

/** Fila del listado de compras de un evento (vista del organizador). */
export function compraDeEventoToDTO(compra, comprador) {
  return {
    id: compra.id,
    comprador: comprador
      ? { id: comprador.id, nombre: comprador.nombre, apellido: comprador.apellido }
      : { id: compra.compradorId, nombre: null, apellido: null },
    tipoEntrada: { id: compra.tipoEntradaId, nombre: compra.tipoEntradaNombre },
    cantidad: compra.cantidad,
    total: compra.total,
    estado: compra.estado,
    motivoCancelacion: compra.motivoCancelacion,
    fechaCompra: compra.fechaCompra,
    reembolsoPendiente: compra.reembolsoPendiente,
    fechaLimiteReembolso: compra.reembolsoPendiente ? compra.fechaLimiteReembolso : null,
    acciones: { puedeReembolsar: puedeReembolsar(compra) },
  };
}
