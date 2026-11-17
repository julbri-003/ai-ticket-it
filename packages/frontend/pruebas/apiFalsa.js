import api from "../src/service/api";

/**
 * Reemplaza el adapter de axios por respuestas armadas en el test. Así corren los interceptores
 * reales (Bearer y 401). `rutas` = { "GET /auth/me": (config) => [status, data] }.
 */
export function apiFalsa(rutas) {
  const llamadas = [];
  api.defaults.adapter = async (config) => {
    const clave = `${config.method.toUpperCase()} ${config.url}`;
    llamadas.push({ clave, config });
    const manejador = rutas[clave];
    const [status, data] = manejador
      ? await manejador(config)
      : [404, { message: `Sin mock: ${clave}` }];
    const respuesta = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      const error = new Error(`HTTP ${status}`);
      error.response = respuesta;
      error.config = config;
      error.isAxiosError = true;
      throw error;
    }
    return respuesta;
  };
  return llamadas;
}

export const usuarioComprador = {
  id: "u1",
  nombre: "Ana",
  apellido: "Gómez",
  email: "ana@ticketit.test",
  rol: "COMPRADOR",
};

export const usuarioOrganizador = {
  id: "u2",
  nombre: "Lucía",
  apellido: "Ferrari",
  email: "lucia@ticketit.test",
  rol: "ORGANIZADOR",
  puntajePromedio: 4.5,
  cantidadResenias: 2,
};
