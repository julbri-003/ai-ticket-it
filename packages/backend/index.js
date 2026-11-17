import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import { conectarDB, desconectarDB } from "./db.js";
import { programadorTareas, reloj, repositoriosSemilla } from "./dependencias.js";
import { sembrarDatos } from "./seeds/sembrar.js";
import { inicializarSockets } from "./sockets/index.js";

const port = process.env.PORT || 8000;

await conectarDB();

// Siempre: con Mongo en memoria la base arranca vacía. Es idempotente si se usa MONGO_URI.
await sembrarDatos({ ...repositoriosSemilla, reloj, log: console.log });

// Transiciones automáticas (vencimientos, utilizadas, reembolsos, eventos finalizados).
programadorTareas.iniciar();

// express y socket.io comparten el mismo http.Server (mismo puerto).
const server = http.createServer(app);
const io = inicializarSockets(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend escuchando en puerto ${port}`);
});

const apagar = async () => {
  programadorTareas.detener();
  // Cierra socket.io y también el http.Server sobre el que está montado.
  io.close();
  await desconectarDB();
  process.exit(0);
};

process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
