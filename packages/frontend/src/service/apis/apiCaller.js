import api, { mensajeDeError } from "../api";

/** Error con el mensaje legible del back y, si hubo respuesta, su status. */
export class ErrorApi extends Error {
  constructor(error) {
    super(mensajeDeError(error));
    this.name = "ErrorApi";
    this.status = error?.response?.status ?? null;
    this.detalles = error?.response?.data?.detalles ?? null;
    this.sinConexion = !error?.response;
  }
}

async function ejecutar(metodo, endpoint, body = null, config = {}) {
  try {
    let response;
    if (metodo === "get" || metodo === "delete") {
      response = await api[metodo](endpoint, config);
    } else {
      response = await api[metodo](endpoint, body, config);
    }
    return response.data;
  } catch (error) {
    throw new ErrorApi(error);
  }
}

export const apiCaller = {
  get: (endpoint, params = {}, config = {}) =>
    ejecutar("get", endpoint, null, { ...config, params }),

  post: (endpoint, body = {}, config = {}) => ejecutar("post", endpoint, body, config),

  put: (endpoint, body = {}, config = {}) => ejecutar("put", endpoint, body, config),

  patch: (endpoint, body = {}, config = {}) => ejecutar("patch", endpoint, body, config),

  delete: (endpoint, config = {}) => ejecutar("delete", endpoint, null, config),

  /** multipart/form-data (subida de archivos). */
  postForm: (endpoint, formData, config = {}) =>
    ejecutar("post", endpoint, formData, {
      ...config,
      headers: { ...config.headers, "Content-Type": "multipart/form-data" },
      transformRequest: (datos) => datos,
    }),
};

export default apiCaller;
