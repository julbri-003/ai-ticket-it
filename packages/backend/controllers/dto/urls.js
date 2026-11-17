/**
 * Base pública para armar URLs absolutas de archivos (el celular no entiende rutas relativas).
 * Usa PUBLIC_BASE_URL si está definida; si no, la infiere del request (protocolo + host).
 */
export function baseUrlDe(req) {
  const configurada = process.env.PUBLIC_BASE_URL?.trim();
  if (configurada) return configurada.replace(/\/+$/, "");
  return req ? `${req.protocol}://${req.get("host")}` : "";
}

export function urlAbsoluta(ruta, baseUrl = "") {
  if (!ruta) return null;
  if (/^https?:\/\//i.test(ruta)) return ruta;
  return `${baseUrl}${ruta.startsWith("/") ? "" : "/"}${ruta}`;
}
