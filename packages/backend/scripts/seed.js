// Siembra los datos de demo en la base configurada y termina.
// Útil con MONGO_URI (base real para debug). Sin MONGO_URI siembra una base en memoria que se
// descarta al terminar: el back ya siembra solo al arrancar.
import "dotenv/config";
import { conectarDB, desconectarDB } from "../db.js";
import { reloj, repositoriosSemilla } from "../dependencias.js";
import { sembrarDatos } from "../seeds/sembrar.js";

if (!process.env.MONGO_URI?.trim()) {
  console.warn("⚠️  Sin MONGO_URI: se siembra una base en memoria que se descarta al terminar.");
}

await conectarDB();
try {
  await sembrarDatos({ ...repositoriosSemilla, reloj, log: console.log });
} finally {
  await desconectarDB();
}
