import { useState } from "react";
import styled, { useTheme } from "styled-components/native";
import { Send } from "lucide-react-native";
import { useFoco } from "../ui/foco";
import { MAX_CARACTERES_MENSAJE } from "../../service/mensajesService";

/** Caja de texto del chat con contador (máx. 1000) y botón enviar (deshabilitado si está vacía). */
export function EntradaMensaje({ onEnviar }) {
  const theme = useTheme();
  const [texto, setTexto] = useState("");
  const { enfocado, propsFoco } = useFoco();
  const vacio = texto.trim().length === 0;

  const enviar = () => {
    if (vacio) return;
    onEnviar(texto);
    setTexto("");
  };

  return (
    <Barra>
      <Columna>
        <Campo
          value={texto}
          onChangeText={setTexto}
          placeholder="Escribí un mensaje"
          placeholderTextColor={theme.colors.textMuted}
          multiline
          maxLength={MAX_CARACTERES_MENSAJE}
          accessibilityLabel="Mensaje"
          accessibilityHint={`Hasta ${MAX_CARACTERES_MENSAJE} caracteres`}
          $enfocado={enfocado}
          testID="chat-input"
          {...propsFoco}
        />
        <Contador accessibilityLabel={`${texto.length} de ${MAX_CARACTERES_MENSAJE} caracteres`}>
          {texto.length}/{MAX_CARACTERES_MENSAJE}
        </Contador>
      </Columna>
      <BotonEnviar
        onPress={enviar}
        disabled={vacio}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
        accessibilityState={{ disabled: vacio }}
        $vacio={vacio}
        testID="chat-enviar"
      >
        <Send size={20} color={theme.colors.onPrimary} accessible={false} />
      </BotonEnviar>
    </Barra>
  );
}

const Barra = styled.View`
  flex-direction: row;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 16px 12px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.background};
`;

const Columna = styled.View`
  flex: 1;
  gap: 2px;
`;

const Campo = styled.TextInput`
  min-height: 44px;
  max-height: 120px;
  padding: 10px 14px;
  border-radius: 22px;
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.borderInput};
  background-color: ${({ theme }) => theme.colors.surface};
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Contador = styled.Text`
  align-self: flex-end;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const BotonEnviar = styled.Pressable`
  width: 48px;
  height: 48px;
  margin-bottom: 18px;
  border-radius: 24px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
  opacity: ${({ $vacio }) => ($vacio ? 0.45 : 1)};
`;

export default EntradaMensaje;
