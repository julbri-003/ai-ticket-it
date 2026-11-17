import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ThemeProvider as StyledThemeProvider } from "styled-components/native";
import { temas } from "../styles/theme";

const PREFERENCIA_KEY = "ati_tema";
export const PREFERENCIAS_TEMA = ["sistema", "claro", "oscuro"];

const ThemeContext = createContext(undefined);

/**
 * Claro, oscuro o el del sistema (por defecto). La preferencia se persiste.
 * Misma API que REPO_REF: { mode, theme, toggleTheme, setThemeMode } + preferencia.
 */
export function ThemeProvider({ children, preferenciaInicial = "sistema" }) {
  const esquemaSistema = useColorScheme();
  const [preferencia, setPreferencia] = useState(preferenciaInicial);

  useEffect(() => {
    let vigente = true;
    SecureStore.getItemAsync(PREFERENCIA_KEY)
      .then((guardada) => {
        if (vigente && PREFERENCIAS_TEMA.includes(guardada)) setPreferencia(guardada);
      })
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, []);

  const setThemeMode = useCallback((nueva) => {
    if (!PREFERENCIAS_TEMA.includes(nueva)) return;
    setPreferencia(nueva);
    SecureStore.setItemAsync(PREFERENCIA_KEY, nueva).catch(() => {});
  }, []);

  const mode =
    preferencia === "sistema"
      ? esquemaSistema === "dark"
        ? "dark"
        : "light"
      : preferencia === "oscuro"
        ? "dark"
        : "light";

  const toggleTheme = useCallback(() => {
    setThemeMode(mode === "dark" ? "claro" : "oscuro");
  }, [mode, setThemeMode]);

  const valor = useMemo(
    () => ({ mode, theme: temas[mode], preferencia, toggleTheme, setThemeMode }),
    [mode, preferencia, toggleTheme, setThemeMode],
  );

  return (
    <ThemeContext.Provider value={valor}>
      <StyledThemeProvider theme={temas[mode]}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const contexto = useContext(ThemeContext);
  if (!contexto) throw new Error("useTheme debe usarse dentro de un ThemeProvider");
  return contexto;
};

/** Alias con el nombre de REPO_REF. */
export const useAppTheme = useTheme;
