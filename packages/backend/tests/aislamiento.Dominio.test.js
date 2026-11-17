import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Criterio de aceptación: el dominio es puro. Ningún archivo de domain/ importa
// mongoose, express, servicios, repositorios ni nada de HTTP.
const directorioDominio = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "domain");
const archivos = fs.readdirSync(directorioDominio).filter((f) => f.endsWith(".js"));
const IMPORTS_PERMITIDOS = [/^\.\/[\w]+\.js$/, /^\.\.\/errors\//, /^\.\.\/utils\//];

describe("Aislamiento del dominio", () => {
  test("hay archivos de dominio para revisar", () => {
    expect(archivos.length).toBeGreaterThan(10);
  });

  test.each(archivos)("%s solo importa dominio, errors o utils", (archivo) => {
    const fuente = fs.readFileSync(path.join(directorioDominio, archivo), "utf8");
    const imports = [
      ...fuente.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g),
    ].map((m) => m[1]);
    const prohibidos = imports.filter((ruta) => !IMPORTS_PERMITIDOS.some((re) => re.test(ruta)));
    expect(prohibidos).toEqual([]);
  });
});

// Criterio de aceptación (iteración 05): ningún service cambia `estado` directamente; las
// transiciones pasan siempre por los métodos del dominio.
describe("Los estados solo cambian en el dominio", () => {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const archivosDe = (carpeta) =>
    fs
      .readdirSync(path.join(raiz, carpeta))
      .filter((f) => f.endsWith(".js"))
      .map((f) => path.join(carpeta, f));
  const capas = [...archivosDe("services"), ...archivosDe("controllers"), ...archivosDe("jobs")];

  test.each(capas)("%s no asigna `estado`", (archivo) => {
    const fuente = fs.readFileSync(path.join(raiz, archivo), "utf8");
    expect(fuente).not.toMatch(/\.estado\s*=(?!=)/);
  });
});

// Criterio de aceptación (iteración 06): ningún service importa socket.io; solo el adapter
// (adapter/EmisorSocketAdapter.js) y el montaje del servidor (sockets/index.js) lo conocen.
describe("socket.io queda detrás del adapter", () => {
  const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
  const archivos = ["services", "controllers", "domain", "repositories", "routes"].flatMap(
    (carpeta) =>
      fs
        .readdirSync(path.join(raiz, carpeta), { recursive: true })
        .filter((f) => String(f).endsWith(".js"))
        .map((f) => path.join(carpeta, String(f))),
  );

  test.each(archivos)("%s no importa socket.io", (archivo) => {
    const fuente = fs.readFileSync(path.join(raiz, archivo), "utf8");
    expect(fuente).not.toMatch(/from\s+["']socket\.io/);
  });
});
