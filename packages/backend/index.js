import "dotenv/config";
import http from "node:http";
import app from "./app.js";
import { conectarDB, desconectarDB } from "./db.js";

const port = process.env.PORT || 8000;

await conectarDB();

// TODO iteración 03: sembrar los datos iniciales acá (seeds/sembrar.js).

// Se crea el http.Server a mano para poder montar socket.io más adelante.
const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend escuchando en puerto ${port}`);
});

const apagar = async () => {
  server.close();
  await desconectarDB();
  process.exit(0);
};

process.on("SIGINT", apagar);
process.on("SIGTERM", apagar);
