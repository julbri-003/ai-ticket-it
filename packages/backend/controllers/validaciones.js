import { z } from "zod";

// Piezas de zod compartidas por los controllers.

export const objectId = (campo = "id") =>
  z.string().regex(/^[0-9a-fA-F]{24}$/, `${campo} no es un identificador válido`);

export const idParamSchema = z.object({ id: objectId("El id del evento") });
export const eventoIdParamSchema = z.object({ eventoId: objectId("El id del evento") });

/** "true" | "false" de un query string → boolean. */
export const booleanoQuery = z
  .enum(["true", "false"], { error: 'Debe ser "true" o "false"' })
  .transform((v) => v === "true");

/** Fecha ISO: "2026-12-10" o "2026-12-10T21:00:00Z" / con offset. */
export const fechaIso = z.union([z.iso.date(), z.iso.datetime({ offset: true })], {
  error: "Debe ser una fecha ISO (AAAA-MM-DD o fecha y hora con zona)",
});

export const paginadoSchema = z.object({
  pagina: z.coerce.number().int().min(1, "pagina debe ser 1 o más").default(1),
  limite: z.coerce
    .number()
    .int()
    .min(1, "limite debe ser 1 o más")
    .max(50, "limite admite como máximo 50")
    .default(10),
});
