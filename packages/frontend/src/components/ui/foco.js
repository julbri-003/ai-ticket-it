import { useCallback, useState } from "react";

/**
 * Estado de foco (teclado externo / web / TV) para dibujar un anillo visible.
 * Uso: const { enfocado, propsFoco } = useFoco(); <Boton {...propsFoco} $enfocado={enfocado} />
 */
export function useFoco({ onFocus, onBlur } = {}) {
  const [enfocado, setEnfocado] = useState(false);
  const alEnfocar = useCallback(
    (e) => {
      setEnfocado(true);
      onFocus?.(e);
    },
    [onFocus],
  );
  const alDesenfocar = useCallback(
    (e) => {
      setEnfocado(false);
      onBlur?.(e);
    },
    [onBlur],
  );
  return { enfocado, propsFoco: { onFocus: alEnfocar, onBlur: alDesenfocar, focusable: true } };
}
