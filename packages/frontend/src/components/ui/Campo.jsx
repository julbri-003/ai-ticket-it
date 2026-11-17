import styled, { useTheme } from "styled-components/native";
import { AlertCircle } from "lucide-react-native";

/**
 * Estructura común de Input, Textarea y Select: label visible (con * si es obligatorio), el
 * control, el texto de ayuda y el error (con ícono, color de error y anuncio al lector).
 */
export function Campo({ label, requerido, ayuda, error, nativeID, extraLabel, children }) {
  const theme = useTheme();
  return (
    <Contenedor>
      <FilaLabel>
        <Label nativeID={nativeID}>
          {label}
          {requerido ? <Asterisco accessibilityLabel=" (obligatorio)"> *</Asterisco> : null}
        </Label>
        {extraLabel}
      </FilaLabel>
      {children}
      {ayuda && !error ? <Ayuda>{ayuda}</Ayuda> : null}
      {error ? (
        <FilaError accessible accessibilityLiveRegion="polite" accessibilityRole="alert">
          <AlertCircle size={16} color={theme.colors.error} accessible={false} />
          <TextoError>{error}</TextoError>
        </FilaError>
      ) : null}
    </Contenedor>
  );
}

export const LeyendaObligatorio = styled.Text.attrs({ children: "* Obligatorio" })`
  align-self: flex-end;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Contenedor = styled.View`
  gap: 6px;
`;

const FilaLabel = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Label = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Asterisco = styled.Text`
  color: ${({ theme }) => theme.colors.accentText};
`;

const Ayuda = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const FilaError = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const TextoError = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.error};
`;

/** Marco del control (borde de input, foco y error). */
export const MarcoControl = styled.View`
  flex-direction: row;
  align-items: center;
  min-height: ${({ theme }) => theme.tactil + 4}px;
  padding: 0 4px 0 16px;
  border-radius: ${({ theme }) => theme.borderRadius.input}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $enfocado, $error }) => ($enfocado || $error ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado, $error }) =>
    $error ? theme.colors.error : $enfocado ? theme.colors.focusRing : theme.colors.borderInput};
`;
