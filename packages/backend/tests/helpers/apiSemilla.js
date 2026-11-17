import request from "supertest";
import app from "../../app.js";
import { eventosRepository, reloj, repositoriosSemilla } from "../../dependencias.js";
import { EVENTOS, PASSWORD_DEMO } from "../../seeds/datosSemilla.js";
import { sembrarDatos } from "../../seeds/sembrar.js";
import { bajarDB, levantarDB } from "./dbMemoria.js";

export { app, request };

/** Base en memoria con los datos de demo (fechas relativas al momento de correr el test). */
export async function prepararApiConSemilla() {
  await levantarDB();
  await sembrarDatos({ ...repositoriosSemilla, reloj });
}

export const cerrarApi = bajarDB;

const tokens = new Map();

/** Token de un usuario de la semilla (login real, cacheado por suite). */
export async function tokenDe(email) {
  if (!tokens.has(email)) {
    const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD_DEMO });
    if (res.status !== 200) throw new Error(`No se pudo loguear ${email}: ${res.status}`);
    tokens.set(email, res.body.token);
  }
  return tokens.get(email);
}

export const auth = async (email) => ({ Authorization: `Bearer ${await tokenDe(email)}` });

/** Evento de la semilla por clave (jazz, hamlet, acustico...). */
export async function eventoSemilla(clave) {
  return eventosRepository.obtenerPorNombre(EVENTOS[clave].nombre);
}

/** Verifica que una respuesta no exponga datos sensibles ni campos internos de mongoose. */
export function sinCamposInternos(body) {
  const json = JSON.stringify(body);
  return !/"(passwordHash|_id|__v|textoBusqueda|nombreBusqueda)"/.test(json);
}
