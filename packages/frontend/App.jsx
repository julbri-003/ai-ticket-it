import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import styled from "styled-components/native";
import { obtenerEstadoBackend } from "./src/service/healthService";
import { API_URL } from "./src/service/api";

// Placeholder de la iteración 01: prueba la conectividad celular → back.
// Los tokens de color salen de la paleta "Telón de terciopelo" (modo claro); theme.js llega en la 07.
const colores = {
  background: "#faf7f2",
  surface: "#ffffff",
  textPrimary: "#1c1416",
  textSecondary: "#4a3a3e",
  primary: "#7a1e2c",
  success: "#1f6b52",
  error: "#a3182b",
  onFilled: "#ffffff",
};

export default function App() {
  const [estado, setEstado] = useState(null);
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(true);

  const consultar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setEstado(await obtenerEstadoBackend());
    } catch (e) {
      setEstado(null);
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    consultar();
  }, [consultar]);

  return (
    <Contenedor>
      <Titulo accessibilityRole="header">AI Ticket It</Titulo>
      <Etiqueta>Estado del back ({API_URL}/health)</Etiqueta>

      {cargando ? (
        <ActivityIndicator
          color={colores.primary}
          accessibilityLabel="Consultando el estado del back"
        />
      ) : (
        <Resultado
          testID="resultado-health"
          $error={Boolean(error)}
          accessibilityLiveRegion="polite"
          accessibilityRole={error ? "alert" : "text"}
        >
          {error ? `✕ Error: ${error}` : `✓ ${estado}`}
        </Resultado>
      )}

      <Boton
        onPress={consultar}
        disabled={cargando}
        accessibilityRole="button"
        accessibilityLabel="Reintentar la consulta de estado"
        accessibilityState={{ busy: cargando, disabled: cargando }}
      >
        <TextoBoton>Reintentar</TextoBoton>
      </Boton>

      <StatusBar style="dark" />
    </Contenedor>
  );
}

const Contenedor = styled.View`
  flex: 1;
  background-color: ${colores.background};
  align-items: center;
  justify-content: center;
  padding: 24px;
  gap: 16px;
`;

const Titulo = styled.Text`
  font-size: 28px;
  font-weight: 700;
  color: ${colores.textPrimary};
`;

const Etiqueta = styled.Text`
  font-size: 14px;
  color: ${colores.textSecondary};
  text-align: center;
`;

const Resultado = styled.Text`
  font-size: 22px;
  font-weight: 700;
  color: ${(p) => (p.$error ? colores.error : colores.success)};
  text-align: center;
`;

const Boton = styled.Pressable`
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;
  border-radius: 8px;
  background-color: ${colores.primary};
  opacity: ${(p) => (p.disabled ? 0.6 : 1)};
  justify-content: center;
`;

const TextoBoton = styled.Text`
  color: ${colores.onFilled};
  font-weight: 700;
`;
