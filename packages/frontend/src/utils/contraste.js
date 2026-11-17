// Contraste WCAG 2.1 entre dos colores hexadecimales (#rrggbb).

function canal(valor) {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function luminancia(hex) {
  const limpio = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Relación de contraste (1 a 21). */
export function contraste(colorA, colorB) {
  const [claro, oscuro] = [luminancia(colorA), luminancia(colorB)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Texto normal ≥ 4,5:1; texto grande, íconos y bordes ≥ 3:1. */
export const cumpleAA = (texto, fondo, { grande = false } = {}) =>
  contraste(texto, fondo) >= (grande ? 3 : 4.5);
