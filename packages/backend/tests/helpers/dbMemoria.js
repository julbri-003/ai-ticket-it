import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Levanta y baja un MongoMemoryServer por suite:
//   beforeAll(levantarDB); afterEach(limpiarDB); afterAll(bajarDB);
let servidor = null;

export async function levantarDB() {
  servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri(), { dbName: "ai-ticket-it-test" });
  // Construye los índices (únicos, de texto) antes de que los tests dependan de ellos.
  await Promise.all(Object.values(mongoose.models).map((modelo) => modelo.init()));
}

export async function limpiarDB() {
  const colecciones = Object.values(mongoose.connection.collections);
  await Promise.all(colecciones.map((c) => c.deleteMany({})));
}

export async function bajarDB() {
  await mongoose.disconnect();
  if (servidor) {
    await servidor.stop();
    servidor = null;
  }
}
