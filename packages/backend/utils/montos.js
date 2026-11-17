const formatoPesos = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Redondea un monto a 2 decimales evitando errores de coma flotante (1.005 → 1.01). */
export function redondearMonto(monto) {
  return Math.round((Number(monto) + Number.EPSILON) * 100) / 100;
}

/** Formatea un monto en pesos argentinos: 45000 → "$45.000,00". */
export function formatearMonto(monto) {
  return `$${formatoPesos.format(redondearMonto(monto))}`;
}
