import { useState } from "react";
import { Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import styled, { useTheme } from "styled-components/native";
import { CalendarDays, Clock } from "lucide-react-native";
import { Campo } from "../ui/Campo";
import { useFoco } from "../ui/foco";
import { fechaLargaTexto, horaTexto } from "../../utils/fechas";

function BotonCampo({ icono: Icono, texto, etiqueta, onPress, testID, error }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  return (
    <Boton
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint="Abre el selector"
      $enfocado={enfocado}
      $error={error}
      testID={testID}
      {...propsFoco}
    >
      <Icono size={18} color={theme.colors.textSecondary} accessible={false} />
      <TextoBoton>{texto}</TextoBoton>
    </Boton>
  );
}

/**
 * Fecha y hora del evento con el selector nativo (solo fechas futuras). En Android se elige
 * primero el día y después la hora; en iOS, un selector combinado.
 */
export function CampoFechaHora({ valor, onCambiar, error, label = "Fecha y hora", requerido }) {
  const [modo, setModo] = useState(null); // "date" | "time" | null
  const ahora = new Date();

  const elegir = (evento, fecha) => {
    const tipo = modo;
    setModo(Platform.OS === "ios" ? modo : null);
    if (evento?.type === "dismissed" || !fecha) return;
    const base = valor ? new Date(valor) : new Date(ahora.getTime() + 24 * 3600 * 1000);
    if (tipo === "date") {
      base.setFullYear(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      if (!valor) base.setHours(21, 0, 0, 0);
    } else {
      base.setHours(fecha.getHours(), fecha.getMinutes(), 0, 0);
    }
    onCambiar(base);
  };

  return (
    <Campo label={label} requerido={requerido} error={error} ayuda="Solo fechas futuras.">
      <Fila>
        <BotonCampo
          icono={CalendarDays}
          texto={valor ? fechaLargaTexto(valor) : "Elegir día"}
          etiqueta={valor ? `Día: ${fechaLargaTexto(valor)}. Cambiar` : "Elegir día"}
          onPress={() => setModo("date")}
          testID="campo-fecha"
          error={Boolean(error)}
        />
        <BotonCampo
          icono={Clock}
          texto={valor ? horaTexto(valor) : "Hora"}
          etiqueta={valor ? `Hora: ${horaTexto(valor)}. Cambiar` : "Elegir hora"}
          onPress={() => setModo("time")}
          testID="campo-hora"
          error={Boolean(error)}
        />
      </Fila>
      {modo ? (
        <DateTimePicker
          value={valor ? new Date(valor) : ahora}
          mode={modo}
          minimumDate={modo === "date" ? ahora : undefined}
          is24Hour
          locale="es-AR"
          onChange={elegir}
          testID="selector-fecha-hora"
        />
      ) : null}
    </Campo>
  );
}

const Fila = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const Boton = styled.Pressable`
  flex-grow: 1;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: ${({ theme }) => theme.borderRadius.input}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $enfocado, $error }) => ($enfocado || $error ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado, $error }) =>
    $error ? theme.colors.error : $enfocado ? theme.colors.focusRing : theme.colors.borderInput};
`;

const TextoBoton = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default CampoFechaHora;
