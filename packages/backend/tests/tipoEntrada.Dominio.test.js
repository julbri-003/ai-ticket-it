import { TipoEntrada } from "../domain/tipoEntradaDominio.js";
import { BadRequestError, ConflictError } from "../errors/AppError.js";

const datos = (extra = {}) => ({ nombre: "General", precio: 1000, cupo: 5, ...extra });

describe("Dominio TipoEntrada", () => {
  test("arranca con todas las entradas disponibles y ninguna vendida", () => {
    const tipo = new TipoEntrada(datos());
    expect(tipo.disponibles).toBe(5);
    expect(tipo.vendidas).toBe(0);
  });

  test("redondea el precio a 2 decimales", () => {
    expect(new TipoEntrada(datos({ precio: 10.005 })).precio).toBe(10.01);
  });

  test.each([0, -10, NaN, "100", undefined])("rechaza el precio %p", (precio) => {
    expect(() => new TipoEntrada(datos({ precio }))).toThrow(BadRequestError);
  });

  test.each([0, -1, 2.5, "5", undefined])("rechaza el cupo %p", (cupo) => {
    expect(() => new TipoEntrada(datos({ cupo }))).toThrow("cupo");
  });

  test.each([-1, 6, 1.5])("rechaza disponibles fuera de 0..cupo: %p", (disponibles) => {
    expect(() => new TipoEntrada(datos({ disponibles }))).toThrow("disponibles");
  });

  test("rechaza un tipo sin nombre", () => {
    expect(() => new TipoEntrada(datos({ nombre: "  " }))).toThrow("nombre");
  });

  test("reservar descuenta disponibles y suma vendidas", () => {
    const tipo = new TipoEntrada(datos());
    tipo.reservar(3);
    expect(tipo.disponibles).toBe(2);
    expect(tipo.vendidas).toBe(3);
  });

  test("puede reservar exactamente lo que queda", () => {
    const tipo = new TipoEntrada(datos());
    tipo.reservar(5);
    expect(tipo.disponibles).toBe(0);
    expect(tipo.hayCupoPara(1)).toBe(false);
  });

  test("reservar más de lo disponible lanza ConflictError y no cambia el cupo", () => {
    const tipo = new TipoEntrada(datos({ disponibles: 2 }));
    expect(() => tipo.reservar(3)).toThrow(ConflictError);
    expect(tipo.disponibles).toBe(2);
  });

  test.each([0, -1, 1.5])("reservar una cantidad inválida (%p) lanza BadRequestError", (c) => {
    expect(() => new TipoEntrada(datos()).reservar(c)).toThrow(BadRequestError);
  });

  test("hayCupoPara", () => {
    const tipo = new TipoEntrada(datos({ disponibles: 2 }));
    expect(tipo.hayCupoPara(2)).toBe(true);
    expect(tipo.hayCupoPara(3)).toBe(false);
    expect(tipo.hayCupoPara(0)).toBe(false);
  });

  test("liberar devuelve entradas al cupo", () => {
    const tipo = new TipoEntrada(datos({ disponibles: 1 }));
    tipo.liberar(3);
    expect(tipo.disponibles).toBe(4);
  });

  test("liberar nunca supera el cupo", () => {
    const tipo = new TipoEntrada(datos({ disponibles: 4 }));
    tipo.liberar(10);
    expect(tipo.disponibles).toBe(5);
  });

  test("liberar una cantidad inválida lanza BadRequestError", () => {
    expect(() => new TipoEntrada(datos()).liberar(0)).toThrow(BadRequestError);
  });

  test("toJSON incluye vendidas", () => {
    const tipo = new TipoEntrada(datos({ id: "t1", disponibles: 3 }));
    expect(tipo.toJSON()).toEqual({
      id: "t1",
      nombre: "General",
      descripcion: "",
      precio: 1000,
      cupo: 5,
      disponibles: 3,
      vendidas: 2,
    });
  });
});
