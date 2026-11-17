import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Levanta y baja un MongoMemoryServer por suite:
//   beforeAll(levantarDB); afterEach(limpiarDB); afterAll(bajarDB);
let servidor = null;

export async function levantarDB() {
  servidor = await MongoMemoryServer.create();
  await mongoose.connect(servidor.getUri(), { dbName: "ai-ticket-it-test" });
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
