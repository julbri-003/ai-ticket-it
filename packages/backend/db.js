import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const NOMBRE_DB = "ai-ticket-it";

let servidorMemoria = null;

// Si MONGO_URI está definida (y no vacía) se usa esa base; si no, se levanta un
// MongoMemoryServer. Los datos en memoria se pierden al reiniciar el proceso.
export const conectarDB = async () => {
  let uri = process.env.MONGO_URI?.trim();

  if (!uri) {
    servidorMemoria = await MongoMemoryServer.create();
    uri = servidorMemoria.getUri();
  }

  await mongoose.connect(uri, { dbName: NOMBRE_DB });

  if (process.env.NODE_ENV !== "test") {
    console.log(
      servidorMemoria ? "📦 Conectado a MongoDB en memoria" : "📦 Conectado a MongoDB (MONGO_URI)",
    );
  }
};

export const desconectarDB = async () => {
  await mongoose.disconnect();
  if (servidorMemoria) {
    await servidorMemoria.stop();
    servidorMemoria = null;
  }
};
