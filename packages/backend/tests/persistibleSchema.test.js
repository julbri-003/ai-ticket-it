import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import { persistiblePlugin } from "../schemas/persistibleSchema.js";
import { UsuarioModel } from "../schemas/usuarioSchema.js";
import { CategoriaModel } from "../schemas/categoriaSchema.js";
import { EventoModel } from "../schemas/eventoSchema.js";
import { CompraModel } from "../schemas/compraSchema.js";
import { ReseniaModel } from "../schemas/reseniaSchema.js";
import { NotificacionModel } from "../schemas/notificacionSchema.js";
import { bajarDB, levantarDB, limpiarDB } from "./helpers/dbMemoria.js";

const MODELOS_RAIZ = [
  UsuarioModel,
  CategoriaModel,
  EventoModel,
  CompraModel,
  ReseniaModel,
  NotificacionModel,
];

const dirSchemas = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "schemas");

describe("persistiblePlugin", () => {
  const schema = new mongoose.Schema({ nombre: String });
  schema.plugin(persistiblePlugin);
  const Prueba = mongoose.models.PruebaPlugin ?? mongoose.model("PruebaPlugin", schema);

  beforeAll(levantarDB);
  afterEach(limpiarDB);
  afterAll(bajarDB);

  beforeEach(async () => {
    await Prueba.create([
      { nombre: "activo" },
      { nombre: "inactivo", activo: false, modificadoPor: "u1", fechaModificacion: new Date() },
    ]);
  });

  test("agrega los campos de auditoría con sus valores por defecto", async () => {
    const doc = await Prueba.findOne({ nombre: "activo" }).lean();
    expect(doc).toMatchObject({ activo: true, fechaModificacion: null, modificadoPor: null });
  });

  test("find, findOne y countDocuments excluyen inactivos por defecto", async () => {
    expect((await Prueba.find()).map((d) => d.nombre)).toEqual(["activo"]);
    expect(await Prueba.findOne({ nombre: "inactivo" })).toBeNull();
    expect(await Prueba.countDocuments()).toBe(1);
  });

  test("incluirInactivos() los trae", async () => {
    expect(await Prueba.find().incluirInactivos()).toHaveLength(2);
    expect(await Prueba.findOne({ nombre: "inactivo" }).incluirInactivos()).not.toBeNull();
    expect(await Prueba.countDocuments().incluirInactivos()).toBe(2);
  });

  test("las actualizaciones no se filtran (permite reactivar)", async () => {
    await Prueba.updateOne({ nombre: "inactivo" }, { activo: true });
    expect(await Prueba.countDocuments()).toBe(2);
  });
});

describe("Schemas raíz", () => {
  test.each(MODELOS_RAIZ.map((m) => [m.modelName, m]))(
    "%s aplica el plugin persistible y timestamps",
    (_, modelo) => {
      for (const campo of [
        "activo",
        "fechaModificacion",
        "modificadoPor",
        "createdAt",
        "updatedAt",
      ]) {
        expect(modelo.schema.path(campo)).toBeDefined();
      }
      expect(modelo.schema.plugins.some((p) => p.fn === persistiblePlugin)).toBe(true);
    },
  );

  test.each(fs.readdirSync(dirSchemas).filter((f) => f !== "persistibleSchema.js"))(
    "%s no redeclara campos del plugin",
    (archivo) => {
      const fuente = fs.readFileSync(path.join(dirSchemas, archivo), "utf8");
      // Declaración de campo ("activo: {" / "activo: Boolean"), no un uso en un índice ("activo: 1").
      expect(fuente).not.toMatch(/\b(activo|fechaModificacion|modificadoPor)\s*:\s*[{[A-Z]/);
    },
  );

  test("índices pedidos por la spec", () => {
    const indices = (modelo) =>
      modelo.schema.indexes().map(([campos, opciones]) => ({ campos, opciones }));
    expect(indices(UsuarioModel)).toContainEqual({
      campos: { email: 1 },
      opciones: expect.objectContaining({ unique: true }),
    });
    expect(indices(EventoModel).map((i) => i.campos)).toEqual(
      expect.arrayContaining([
        { nombre: "text", descripcion: "text" },
        { categoriaId: 1, fecha: 1 },
      ]),
    );
    expect(indices(CompraModel).map((i) => i.campos)).toEqual(
      expect.arrayContaining([
        { compradorId: 1, estado: 1 },
        { eventoId: 1 },
        { estado: 1, fechaLimitePago: 1 },
        { estado: 1, fechaLimiteReembolso: 1 },
      ]),
    );
    expect(indices(ReseniaModel)).toContainEqual({
      campos: { compraId: 1 },
      opciones: expect.objectContaining({ unique: true }),
    });
    expect(indices(NotificacionModel).map((i) => i.campos)).toContainEqual({
      destinatarioId: 1,
      leida: 1,
      fecha: -1,
    });
  });
});
