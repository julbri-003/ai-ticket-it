import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import styled from "styled-components/native";
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from "@expo-google-fonts/playfair-display";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { ToastProvider } from "./src/context/ToastContext";
import { AuthProvider } from "./src/context/AuthContext";
import { AppNavigator } from "./src/routes/AppNavigator";
import { LimiteDeError } from "./src/features/errors/PantallaError";

function BarraDeEstado() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

/** Raíz: fuentes, safe area, tema, avisos, sesión y navegación por rol. */
export default function App() {
  const [fuentesListas] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fuentesListas) return null;

  return (
    <RaizGestos>
      <SafeAreaProvider>
        <ThemeProvider>
          <BarraDeEstado />
          <LimiteDeError>
            <ToastProvider>
              <AuthProvider>
                <AppNavigator />
              </AuthProvider>
            </ToastProvider>
          </LimiteDeError>
        </ThemeProvider>
      </SafeAreaProvider>
    </RaizGestos>
  );
}

// Raíz de gestos (swipe de favoritos con react-native-gesture-handler).
const RaizGestos = styled(GestureHandlerRootView)`
  flex: 1;
`;
