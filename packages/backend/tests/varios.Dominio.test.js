import { Persistible } from "../domain/persistibleDominio.js";
import { Categoria } from "../domain/categoriaDominio.js";
import { Notificacion } from "../domain/notificacionDominio.js";
import { Resenia } from "../domain/reseniaDominio.js";
import { Mensaje } from "../domain/mensajeDominio.js";
import { BadRequestError } from "../errors/AppError.js";
import { formatearMonto, redondearMonto } from "../utils/montos.js";
import { idDe, mismoId } from "../utils/id.js";
import { AHORA, relojFijo } from "./helpers/fabricasDominio.js";

describe("Persistible", () => {
  test("inicia activa y sin modificaciones", () => {
    expect(new Persistible()).toEqual({
      activo: true,
      fechaModificacion: null,
      modificadoPor: null,
    });
  });

  test("baja y alta registran la auditoría con el reloj y la baja repetida no la pisa", () => {
    const entidad = new Persistible();
    const reloj = relojFijo();
    entidad.darDeBaja({ id: "u1" }, reloj);
    reloj.avanzar(1000);
    entidad.darDeBaja({ id: "u2" }, reloj);
    expect(entidad).toEqual({ activo: false, fechaModificacion: AHORA, modificadoPor: "u1" });

    entidad.darDeAlta({ id: "u3" }, reloj);
    entidad.darDeAlta({ id: "u4" }, reloj);
    expect(entidad.activo).toBe(true);
    expect(entidad.modificadoPor).toBe("u3");
  });

  test("sin reloj usa la fecha actual", () => {
    const entidad = new Persistible();
    entidad.darDeBaja({ id: "u1" });
    expect(entidad.fechaModificacion).toBeInstanceOf(Date);
  });

  test.each([undefined, {}, { id: " " }, { id: 3 }])(
    "baja y alta exigen un usuario con id: %p",
    (usuario) => {
      expect(() => new Persistible().darDeBaja(usuario)).toThrow(BadRequestError);
      expect(() => new Persistible().darDeAlta(usuario)).toThrow(BadRequestError);
    },
  );
});

describe("Categoria", () => {
  test("crea una categoría y restaura la auditoría", () => {
    const categoria = new Categoria({ id: "c1", nombre: " Música ", activo: false });
    expect(categoria).toMatchObject({ nombre: "Música", descripcion: "", activo: false });
  });

  test("exige nombre", () => {
    expect(() => new Categoria({ nombre: "" })).toThrow("nombre");
  });

  test("limita la descripción", () => {
    expect(() => new Categoria({ nombre: "X", descripcion: "a".repeat(501) })).toThrow("máximo");
    expect(() => new Categoria({ nombre: "X", descripcion: 3 })).toThrow("texto");
  });
});

describe("Notificacion", () => {
  const datos = {
    destinatarioId: "u1",
    tipo: "COMPRA_CONFIRMADA",
    titulo: "Compra confirmada",
    mensaje: "Tu compra fue confirmada",
    datos: { compraId: "c1" },
    fecha: AHORA,
  };

  test("arranca sin leer y marcarLeida la marca", () => {
    const notificacion = new Notificacion(datos);
    expect(notificacion.leida).toBe(false);
    expect(notificacion.datos).toEqual({ compraId: "c1" });
    notificacion.marcarLeida();
    expect(notificacion.leida).toBe(true);
  });

  test.each(["destinatarioId", "tipo", "titulo", "mensaje", "fecha"])("exige %s", (campo) => {
    expect(() => new Notificacion({ ...datos, [campo]: undefined })).toThrow(BadRequestError);
  });
});

describe("Resenia", () => {
  const datos = {
    compraId: "c1",
    compradorId: "u1",
    compradorNombre: "Ana",
    eventoId: "e1",
    organizadorId: "o1",
    tipoEntradaNombre: "VIP",
    puntuacion: 3.5,
    fecha: AHORA,
  };

  test.each([1, 1.5, 5])("acepta la puntuación %p", (puntuacion) => {
    expect(new Resenia({ ...datos, puntuacion }).puntuacion).toBe(puntuacion);
  });

  test.each([0.5, 5.5, 2.25, NaN, null])("rechaza la puntuación %p", (puntuacion) => {
    expect(() => new Resenia({ ...datos, puntuacion })).toThrow("pasos de 0,5");
  });

  test("el detalle es opcional y admite hasta 1000 caracteres", () => {
    expect(new Resenia(datos).detalle).toBe("");
    expect(new Resenia({ ...datos, detalle: "a".repeat(1000) }).detalle).toHaveLength(1000);
    expect(() => new Resenia({ ...datos, detalle: "a".repeat(1001) })).toThrow("máximo");
  });

  test.each(["compraId", "compradorId", "compradorNombre", "eventoId", "organizadorId"])(
    "exige %s",
    (campo) => {
      expect(() => new Resenia({ ...datos, [campo]: undefined })).toThrow(BadRequestError);
    },
  );
});

describe("Mensaje", () => {
  test("exige autor, rol y fecha", () => {
    const base = {
      usuarioId: "u1",
      usuarioNombre: "Ana",
      rol: "COMPRADOR",
      mensaje: "Hola",
      enviado: AHORA,
    };
    expect(new Mensaje(base).mensaje).toBe("Hola");
    expect(() => new Mensaje({ ...base, usuarioId: null })).toThrow("autor");
    expect(() => new Mensaje({ ...base, rol: "" })).toThrow("rol");
    expect(() => new Mensaje({ ...base, enviado: "x" })).toThrow("fecha");
  });
});

describe("utils", () => {
  test("redondearMonto y formatearMonto", () => {
    expect(redondearMonto(1.005)).toBe(1.01);
    expect(formatearMonto(45000)).toBe("$45.000,00");
    expect(formatearMonto(1234.5)).toBe("$1.234,50");
  });

  test("idDe y mismoId", () => {
    expect(idDe({ id: "a" })).toBe("a");
    expect(idDe({ _id: { toString: () => "b" } })).toBe("b");
    expect(idDe({ toHexString: () => "c" })).toBe("c");
    expect(idDe("d")).toBe("d");
    expect(mismoId({ id: 1 }, "1")).toBe(true);
    expect(mismoId(null, "1")).toBe(false);
  });
});
