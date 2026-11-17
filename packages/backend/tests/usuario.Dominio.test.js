import { Usuario } from "../domain/usuarioDominio.js";
import { Roles } from "../domain/rolesDominio.js";
import { BadRequestError, ForbiddenError } from "../errors/AppError.js";

const datos = (extra = {}) => ({
  id: "u1",
  nombre: "Ana",
  apellido: "Pérez",
  email: "  Ana@Mail.com ",
  passwordHash: "hash",
  rol: Roles.COMPRADOR,
  ...extra,
});

describe("Dominio Usuario", () => {
  test("Roles está congelado y solo tiene COMPRADOR y ORGANIZADOR", () => {
    expect(Object.isFrozen(Roles)).toBe(true);
    expect(Object.values(Roles)).toEqual(["COMPRADOR", "ORGANIZADOR"]);
  });

  test("normaliza el email y arranca activo, sin favoritos", () => {
    const usuario = new Usuario(datos());
    expect(usuario.email).toBe("ana@mail.com");
    expect(usuario.favoritos).toEqual([]);
    expect(usuario.activo).toBe(true);
    expect(usuario.nombreCompleto).toBe("Ana Pérez");
  });

  test.each([
    [{ email: "no-es-email" }, "email"],
    [{ email: undefined }, "email"],
    [{ passwordHash: "" }, "contraseña"],
    [{ rol: "ADMIN" }, "rol"],
    [{ nombre: " " }, "nombre"],
    [{ apellido: undefined }, "apellido"],
  ])("rechaza datos inválidos %p", (extra, mensaje) => {
    expect(() => new Usuario(datos(extra))).toThrow(mensaje);
  });

  test("el comprador no tiene puntaje; el organizador arranca en 0", () => {
    expect(new Usuario(datos()).puntajePromedio).toBeUndefined();
    const organizador = new Usuario(datos({ rol: Roles.ORGANIZADOR }));
    expect(organizador.puntajePromedio).toBe(0);
    expect(organizador.cantidadResenias).toBe(0);
  });

  describe("favoritos", () => {
    test("agregarFavorito es idempotente", () => {
      const usuario = new Usuario(datos());
      usuario.agregarFavorito("e1");
      usuario.agregarFavorito("e1");
      expect(usuario.favoritos).toEqual(["e1"]);
      expect(usuario.esFavorito("e1")).toBe(true);
    });

    test("quitarFavorito saca el evento y no falla si no estaba", () => {
      const usuario = new Usuario(datos({ favoritos: ["e1", "e2"] }));
      usuario.quitarFavorito("e1");
      usuario.quitarFavorito("no-estaba");
      expect(usuario.favoritos).toEqual(["e2"]);
    });

    test("agregarFavorito exige un evento", () => {
      expect(() => new Usuario(datos()).agregarFavorito(undefined)).toThrow(BadRequestError);
    });

    test("un organizador no puede tener favoritos", () => {
      const organizador = new Usuario(datos({ rol: Roles.ORGANIZADOR }));
      expect(() => organizador.agregarFavorito("e1")).toThrow(ForbiddenError);
      expect(() => organizador.quitarFavorito("e1")).toThrow(ForbiddenError);
    });
  });

  describe("reseñas del organizador", () => {
    test("recalcula el promedio de forma incremental", () => {
      const organizador = new Usuario(datos({ rol: Roles.ORGANIZADOR }));
      organizador.registrarResenia(5);
      organizador.registrarResenia(4);
      organizador.registrarResenia(3.5);
      expect(organizador.cantidadResenias).toBe(3);
      expect(organizador.puntajePromedio).toBeCloseTo(12.5 / 3);
    });

    test("parte de un promedio guardado", () => {
      const organizador = new Usuario(
        datos({ rol: Roles.ORGANIZADOR, puntajePromedio: 4, cantidadResenias: 2 }),
      );
      organizador.registrarResenia(1);
      expect(organizador.puntajePromedio).toBe(3);
    });

    test.each([0, 5.5, 3.3, "4"])("rechaza la puntuación %p", (puntuacion) => {
      const organizador = new Usuario(datos({ rol: Roles.ORGANIZADOR }));
      expect(() => organizador.registrarResenia(puntuacion)).toThrow(BadRequestError);
    });

    test("un comprador no recibe reseñas", () => {
      expect(() => new Usuario(datos()).registrarResenia(5)).toThrow(ForbiddenError);
    });
  });

  test("toJSON nunca expone el hash de la contraseña", () => {
    const comprador = JSON.parse(JSON.stringify(new Usuario(datos())));
    const organizador = JSON.parse(JSON.stringify(new Usuario(datos({ rol: Roles.ORGANIZADOR }))));
    expect(comprador.passwordHash).toBeUndefined();
    expect(comprador.favoritos).toEqual([]);
    expect(organizador).toMatchObject({ puntajePromedio: 0, cantidadResenias: 0 });
    expect(organizador.favoritos).toBeUndefined();
  });
});
