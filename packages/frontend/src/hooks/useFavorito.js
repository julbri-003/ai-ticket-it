import { useCallback, useState } from "react";
import { useToast } from "../context/ToastContext";
import { favoritosService } from "../service/favoritosService";

/**
 * Favorito optimista: el corazón cambia al instante; si el back falla, vuelve atrás con un aviso.
 * Al quitar, el aviso ofrece "Deshacer".
 */
export function useFavorito({ alCambiar } = {}) {
  const toast = useToast();
  const [cambios, setCambios] = useState({});

  const esFavorito = useCallback((evento) => cambios[evento.id] ?? evento.esFavorito, [cambios]);

  const guardar = useCallback(
    async (evento, nuevo) => {
      setCambios((c) => ({ ...c, [evento.id]: nuevo }));
      try {
        if (nuevo) await favoritosService.agregar(evento.id);
        else await favoritosService.quitar(evento.id);
        alCambiar?.(evento, nuevo);
        return true;
      } catch (error) {
        setCambios((c) => ({ ...c, [evento.id]: !nuevo }));
        toast.error(error.message, "No pudimos actualizar tus favoritos");
        return false;
      }
    },
    [alCambiar, toast],
  );

  const alternar = useCallback(
    async (evento) => {
      const nuevo = !esFavorito(evento);
      const ok = await guardar(evento, nuevo);
      if (!ok) return;
      if (nuevo) {
        toast.success(`Guardaste ${evento.nombre} en favoritos.`, "Favoritos");
      } else {
        toast.mostrar({
          tipo: "info",
          titulo: "Favoritos",
          mensaje: `Quitaste ${evento.nombre} de favoritos.`,
          accion: { etiqueta: "Deshacer", alPresionar: () => guardar(evento, true) },
        });
      }
    },
    [esFavorito, guardar, toast],
  );

  return { esFavorito, alternar, guardar };
}
