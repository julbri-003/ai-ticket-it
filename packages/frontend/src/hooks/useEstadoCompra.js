import { useCallback, useRef } from "react";
import { useEventoSocket } from "../context/SocketContext";

/**
 * Llama a `alCambiar(payload)` cuando llega `compra:estado`. Con `compraId`, solo para esa compra;
 * sin él, para cualquiera (listas: Mis compras, Compras del evento).
 */
export function useEstadoCompra(compraId, alCambiar) {
  const ref = useRef(alCambiar);
  ref.current = alCambiar;
  const manejador = useCallback(
    (payload) => {
      if (compraId && String(payload?.compraId) !== String(compraId)) return;
      ref.current?.(payload);
    },
    [compraId],
  );
  useEventoSocket("compra:estado", manejador);
}

export default useEstadoCompra;
