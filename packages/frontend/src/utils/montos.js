const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const pesosSinDecimales = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/** 45000 → "$ 45.000,00" */
export const montoTexto = (monto) => pesos.format(monto);

/** 45000 → "$ 45.000" (precios de tarjetas) */
export const precioTexto = (monto) => pesosSinDecimales.format(monto);
