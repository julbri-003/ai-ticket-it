import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Preferencia del sistema "Reducir movimiento" (iOS) / "Quitar animaciones" (Android).
 * Devuelve `null` mientras no se conoce: las animaciones esperan a tener un booleano.
 */
export function useMovimientoReducido() {
  const [reducido, setReducido] = useState(null);

  useEffect(() => {
    let activo = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => activo && setReducido(Boolean(valor)))
      .catch(() => activo && setReducido(false));
    const suscripcion = AccessibilityInfo.addEventListener("reduceMotionChanged", (valor) =>
      setReducido(Boolean(valor)),
    );
    return () => {
      activo = false;
      suscripcion?.remove?.();
    };
  }, []);

  return reducido;
}

export default useMovimientoReducido;
