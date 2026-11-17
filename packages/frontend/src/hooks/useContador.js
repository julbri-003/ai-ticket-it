import { useEffect, useState } from "react";

/** Easing "out" cúbico: arranca rápido y frena al llegar. */
export const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/**
 * Valor intermedio de un contador en `progreso` (0 a 1), redondeado a `decimales`.
 * Con `final` no numérico devuelve `final` tal cual.
 */
export function valorContador(final, progreso, decimales = 0) {
  if (typeof final !== "number" || !Number.isFinite(final)) return final;
  const p = Math.min(Math.max(progreso, 0), 1);
  const factor = 10 ** decimales;
  return Math.round(final * easeOutCubic(p) * factor) / factor;
}

/**
 * Cuenta desde 0 hasta `valorFinal` en `duracion` ms (una sola vez por valor). Con
 * `activo=false` (movimiento reducido o todavía fuera de pantalla) devuelve el valor final.
 * Usa requestAnimationFrame: solo actualiza un texto, no mueve layout.
 */
export function useContador(valorFinal, { duracion = 1200, activo = true, decimales = 0 } = {}) {
  const animable = activo && typeof valorFinal === "number" && valorFinal > 0;
  const [valor, setValor] = useState(animable ? 0 : valorFinal);

  useEffect(() => {
    if (!animable) {
      setValor(valorFinal);
      return undefined;
    }
    let cuadro;
    let inicio;
    const paso = (ahora) => {
      if (inicio === undefined) inicio = ahora;
      const progreso = (ahora - inicio) / duracion;
      setValor(valorContador(valorFinal, progreso, decimales));
      if (progreso < 1) cuadro = requestAnimationFrame(paso);
    };
    setValor(0);
    cuadro = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(cuadro);
  }, [animable, valorFinal, duracion, decimales]);

  return valor;
}

export default useContador;
