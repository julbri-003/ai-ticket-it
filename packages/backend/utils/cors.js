/** Orígenes permitidos por CORS, compartidos por express y socket.io. Sin configurar: cualquiera. */
export function origenesPermitidos() {
  return process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
        .map((o) => o.trim())
        .filter(Boolean)
    : true;
}
