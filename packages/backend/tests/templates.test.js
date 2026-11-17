import { generarContenidoNotificacion } from "../services/TemplatesService.js";
import { notificationTemplates, TiposNotificacion } from "../templates/notificacionTemplates.js";
import { NotFoundError } from "../errors/AppError.js";
import { formatearFechaHora } from "../utils/fechas.js";

const base = {
  comprador: "Ana Gómez",
  evento: "Noche de Jazz",
  cantidad: 2,
  tipoEntrada: "VIP",
  total: "$84.000,00",
};

describe("TemplatesService", () => {
  test("hay un template por cada tipo de la spec", () => {
    expect(Object.keys(notificationTemplates).sort()).toEqual(
      Object.values(TiposNotificacion).sort(),
    );
  });

  test.each([
    [
      "NUEVA_COMPRA",
      base,
      ["Ana Gómez", "2 entradas VIP", "Noche de Jazz", "$84.000,00", "pendiente"],
    ],
    [
      "COMPRA_CONFIRMADA",
      { ...base, paraOrganizador: false },
      ["Tus 2 entradas VIP", "confirmadas"],
    ],
    ["COMPRA_CONFIRMADA", { ...base, paraOrganizador: true }, ["Ana Gómez pagó", "$84.000,00"]],
    [
      "COMPRA_CANCELADA",
      { ...base, debeReembolsar: true, fechaLimiteReembolso: "18/11/2026 21:00" },
      ["Tenés que reembolsar $84.000,00 antes del 18/11/2026 21:00"],
    ],
    [
      "COMPRA_CANCELADA",
      { ...base, debeReembolsar: false },
      ["antes de pagar", "nada que reembolsar"],
    ],
    ["COMPRA_VENCIDA", base, ["venció", "Noche de Jazz"]],
    ["REEMBOLSO_REALIZADO", { ...base, automatico: true }, ["$84.000,00", "automático"]],
    ["REEMBOLSO_REALIZADO", { ...base, automatico: false }, ["El organizador te reembolsó"]],
    ["ENTRADA_UTILIZADA", base, ["Noche de Jazz", "reseña"]],
    [
      "NUEVO_MENSAJE",
      { autor: "Lucía", evento: "Noche de Jazz", extracto: "Hola" },
      ["Lucía te escribió", '"Hola"'],
    ],
    ["NUEVA_RESENIA", { ...base, puntuacion: 1 }, ["1 estrella."]],
    ["NUEVA_RESENIA", { ...base, puntuacion: 4.5 }, ["4.5 estrellas"]],
    [
      "RECORDATORIO_EVENTO",
      { evento: "Noche de Jazz", fecha: "18/11/2026 21:00", lugar: "Club Sur" },
      ["18/11/2026 21:00", "Club Sur"],
    ],
  ])("%s genera título y mensaje con sus variables", (tipo, variables, esperados) => {
    const { titulo, mensaje } = generarContenidoNotificacion(tipo, variables);
    expect(titulo).toEqual(expect.any(String));
    expect(titulo.length).toBeGreaterThan(0);
    for (const texto of esperados) expect(mensaje).toContain(texto);
    expect(mensaje).not.toContain("undefined");
  });

  test("1 entrada va en singular", () => {
    expect(
      generarContenidoNotificacion("NUEVA_COMPRA", { ...base, cantidad: 1 }).mensaje,
    ).toContain("1 entrada VIP");
  });

  test("un tipo inexistente → NotFoundError", () => {
    expect(() => generarContenidoNotificacion("TIPO_INEXISTENTE", {})).toThrow(NotFoundError);
    expect(() => generarContenidoNotificacion("TIPO_INEXISTENTE", {})).toThrow(/template/i);
  });

  test("las fechas de los textos van en hora de Argentina", () => {
    expect(formatearFechaHora("2026-11-18T00:30:00.000Z")).toBe("17/11/2026 21:30");
  });
});
