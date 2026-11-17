import { darkTheme, lightTheme } from "../src/styles/theme";
import { contraste } from "../src/utils/contraste";

const FONDOS = ["background", "surface", "surfaceSubtle"];
const TEXTOS = [
  "textPrimary",
  "textSecondary",
  "textMuted",
  "accentText",
  "gold",
  "success",
  "warning",
  "error",
  "info",
];
const RELLENOS = [
  ["onPrimary", "primary"],
  ["onSecondary", "secondary"],
  ["onError", "error"],
  ["onTicketStub", "ticketStub"],
  ["onVelvet", "velvet"],
  ["goldOnVelvet", "velvet"],
  ["velvet", "onVelvet"], // botón invertido del banner final
];

/** Color resultante de pintar `arriba` con opacidad `alfa` sobre `abajo` (#rrggbb). */
function mezclar(arriba, abajo, alfa) {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const [a, b] = [rgb(arriba), rgb(abajo)];
  return `#${a
    .map((c, i) =>
      Math.round(c * alfa + b[i] * (1 - alfa))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

describe.each([
  ["claro", lightTheme],
  ["oscuro", darkTheme],
])("Contraste del tema %s (WCAG AA)", (_, { colors }) => {
  test.each(TEXTOS.flatMap((t) => FONDOS.map((f) => [t, f])))(
    "%s sobre %s ≥ 4,5:1",
    (texto, fondo) => {
      expect(contraste(colors[texto], colors[fondo])).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(RELLENOS)("%s sobre %s ≥ 4,5:1", (texto, fondo) => {
    expect(contraste(colors[texto], colors[fondo])).toBeGreaterThanOrEqual(4.5);
  });

  test.each(Object.keys(lightTheme.colors.estados))(
    "estado %s: texto sobre su fondo ≥ 4,5:1",
    (estado) => {
      const { texto, fondo } = colors.estados[estado];
      expect(contraste(texto, fondo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  test.each(FONDOS)("borde de input sobre %s ≥ 3:1", (fondo) => {
    expect(contraste(colors.borderInput, colors[fondo])).toBeGreaterThanOrEqual(3);
  });

  test.each(["textPrimary", "textSecondary", "accentText"])(
    "%s sobre el reflector del hero (dorado con su opacidad sobre surface) ≥ 4,5:1",
    (texto) => {
      const fondo = mezclar(colors.goldOrnament, colors.surface, colors.reflector);
      expect(contraste(colors[texto], fondo)).toBeGreaterThanOrEqual(4.5);
    },
  );

  test("el anillo de foco se distingue del fondo (≥ 3:1)", () => {
    expect(contraste(colors.focusRing, colors.background)).toBeGreaterThanOrEqual(3);
  });
});

test("contraste: negro sobre blanco es 21:1", () => {
  expect(contraste("#000000", "#ffffff")).toBeCloseTo(21, 5);
});
