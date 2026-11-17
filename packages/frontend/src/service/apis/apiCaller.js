import api, { mensajeDeError } from "../api";

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
    throw new Error(mensajeDeError(error));
  }
}

export const apiCaller = {
  get: (endpoint, params = {}, config = {}) =>
    ejecutar("get", endpoint, null, { ...config, params }),

  post: (endpoint, body = {}, config = {}) => ejecutar("post", endpoint, body, config),

  put: (endpoint, body = {}, config = {}) => ejecutar("put", endpoint, body, config),

  patch: (endpoint, body = {}, config = {}) => ejecutar("patch", endpoint, body, config),

  delete: (endpoint, config = {}) => ejecutar("delete", endpoint, null, config),
};

export default apiCaller;
