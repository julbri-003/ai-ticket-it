import { render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider } from "../src/context/ThemeContext";
import { ToastProvider } from "../src/context/ToastContext";

/** Renderiza con safe area, tema (claro por defecto) y avisos. */
export function renderConTema(ui, { preferencia = "claro" } = {}) {
  return render(
    <SafeAreaProvider>
      <ThemeProvider preferenciaInicial={preferencia}>
        <ToastProvider>{ui}</ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}
