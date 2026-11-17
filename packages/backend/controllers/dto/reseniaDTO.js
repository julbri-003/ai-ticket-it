export function reseniaToDTO(resenia, { evento } = {}) {
  return {
    id: resenia.id,
    compradorNombre: resenia.compradorNombre,
    puntuacion: resenia.puntuacion,
    detalle: resenia.detalle,
    fecha: resenia.fecha,
    tipoEntradaNombre: resenia.tipoEntradaNombre,
    evento: { id: resenia.eventoId, nombre: evento?.nombre ?? null },
  };
}
