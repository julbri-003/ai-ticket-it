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
