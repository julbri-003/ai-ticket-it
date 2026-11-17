// Tokens visuales "Telón de terciopelo" (specs/00-contexto-comun.md y design/stitch/_design-system).
// Misma estructura que el theme de REPO_REF (colors, typography, borderRadius, espaciados), pero
// con valores numéricos para React Native. Solo usar estos tokens: los contrastes están testeados.

const typography = {
  // Nombres de las fuentes cargadas con expo-font (@expo-google-fonts).
  fontDisplay: "PlayfairDisplay_700Bold",
  fontDisplayItalic: "PlayfairDisplay_700Bold_Italic",
  fontBody: "Inter_400Regular",
  fontBodyMedium: "Inter_500Medium",
  fontBodySemibold: "Inter_600SemiBold",
  sizes: {
    display: 36,
    headline: 28,
    title: 22,
    titleSm: 18,
    body: 16,
    bodySm: 14,
    caption: 12,
    label: 11,
  },
  letterSpacingLabel: 1.3,
};

const borderRadius = { sm: 6, input: 12, md: 12, lg: 18, xl: 24, full: 9999 };
const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 64 };
const tactil = 44; // área táctil mínima (accesibilidad)

export const lightTheme = {
  mode: "light",
  colors: {
    background: "#faf7f2",
    surface: "#ffffff",
    surfaceSubtle: "#f3ece4",
    surfaceElevated: "#f3ece4",
    ticketStub: "#fbf3ee",
    onTicketStub: "#1c1416",
    textPrimary: "#1c1416",
    textSecondary: "#4a3a3e",
    textMuted: "#6b5a5e",
    primary: "#7a1e2c",
    onPrimary: "#ffffff",
    secondary: "#8a6417",
    onSecondary: "#ffffff",
    accentText: "#7a1e2c",
    gold: "#8a6417",
    goldOrnament: "#b8892b",
    // Terciopelo (telón y banner de la landing): fondo, texto y dorado legible encima.
    velvet: "#7a1e2c",
    velvetShade: "#4f111c",
    onVelvet: "#ffffff",
    goldOnVelvet: "#f2d58a",
    reflector: 0.18, // opacidad del halo dorado del hero (contraste testeado)
    success: "#1f6b52",
    warning: "#8a5300",
    error: "#a3182b",
    onError: "#ffffff",
    info: "#1f3a5f",
    borderInput: "#8c7d80",
    divider: "#e6dcd0",
    focusRing: "#7a1e2c",
    overlay: "rgba(28, 20, 22, 0.55)",
    sombra: "rgba(122, 30, 44, 0.18)",
    skeleton: "#ece3d8",
    skeletonBrillo: "#f7f1ea",
    estados: {
      PENDIENTE: { texto: "#8a5300", fondo: "#fbf0dc" },
      CONFIRMADA: { texto: "#1f6b52", fondo: "#e7f2ec" },
      UTILIZADA: { texto: "#1f3a5f", fondo: "#e6edf6" },
      CANCELADA: { texto: "#a3182b", fondo: "#f9e3e5" },
      REEMBOLSADA: { texto: "#8a6417", fondo: "#f7efdc" },
    },
  },
  typography,
  borderRadius,
  spacing,
  tactil,
};

export const darkTheme = {
  mode: "dark",
  colors: {
    background: "#0f0b0d",
    surface: "#1d1417",
    surfaceSubtle: "#2a1a1f",
    surfaceElevated: "#2a1a1f",
    ticketStub: "#b3122c",
    onTicketStub: "#ffffff",
    textPrimary: "#f5efe6",
    textSecondary: "#d8ccc0",
    textMuted: "#a8998f",
    primary: "#c8102e",
    onPrimary: "#ffffff",
    secondary: "#d4af37",
    onSecondary: "#0f0b0d",
    accentText: "#ff4757",
    gold: "#d4af37",
    goldOrnament: "#d4af37",
    velvet: "#7a0f1f",
    velvetShade: "#3d0710",
    onVelvet: "#ffffff",
    goldOnVelvet: "#f2d58a",
    reflector: 0.08,
    success: "#6fc3a0",
    warning: "#e8b04a",
    error: "#ff8a8a",
    onError: "#0f0b0d",
    info: "#8fb3de",
    borderInput: "#7a6a64",
    divider: "#3a2a2e",
    focusRing: "#f5efe6",
    overlay: "rgba(0, 0, 0, 0.7)",
    sombra: "rgba(0, 0, 0, 0.7)",
    skeleton: "#2a1a1f",
    skeletonBrillo: "#3a2a2e",
    estados: {
      PENDIENTE: { texto: "#e8b04a", fondo: "#33270f" },
      CONFIRMADA: { texto: "#6fc3a0", fondo: "#16302a" },
      UTILIZADA: { texto: "#8fb3de", fondo: "#172433" },
      CANCELADA: { texto: "#ff4757", fondo: "#3a1219" },
      REEMBOLSADA: { texto: "#d4af37", fondo: "#2e2512" },
    },
  },
  typography,
  borderRadius,
  spacing,
  tactil,
};

export const temas = { light: lightTheme, dark: darkTheme };
