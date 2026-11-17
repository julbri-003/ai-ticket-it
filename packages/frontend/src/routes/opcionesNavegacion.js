import { DarkTheme, DefaultTheme } from "@react-navigation/native";

/** Theme de React Navigation a partir de los tokens (fondos, cards y textos del navegador). */
export function temaNavegacion(theme) {
  const base = theme.mode === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.colors.accentText,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.divider,
      notification: theme.colors.primary,
    },
  };
}

/** Opciones comunes de las tab bars (área táctil y colores accesibles). */
export function opcionesTabs(theme) {
  return {
    tabBarActiveTintColor: theme.colors.accentText,
    tabBarInactiveTintColor: theme.colors.textSecondary,
    tabBarStyle: {
      backgroundColor: theme.colors.surface,
      borderTopColor: theme.colors.divider,
      minHeight: 60,
    },
    tabBarLabelStyle: { fontFamily: theme.typography.fontBodyMedium, fontSize: 12 },
    tabBarItemStyle: { minHeight: 48 },
  };
}

/** Header de los stacks de detalle. */
export function opcionesStack(theme) {
  return {
    headerStyle: { backgroundColor: theme.colors.background },
    headerTintColor: theme.colors.textPrimary,
    headerTitleStyle: { fontFamily: theme.typography.fontDisplay },
    contentStyle: { backgroundColor: theme.colors.background },
  };
}
