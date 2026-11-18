import { ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Sparkles, X } from "lucide-react-native";
import { useFoco } from "../ui/foco";

function ChipSugerencia({ texto, onPress, indice }) {
  const { enfocado, propsFoco } = useFoco();
  return (
    <Chip
      onPress={() => onPress(texto)}
      accessibilityRole="button"
      accessibilityLabel={`Usar sugerencia: ${texto}`}
      $enfocado={enfocado}
      testID={`sugerencia-${indice}`}
      {...propsFoco}
    >
      <TextoChip numberOfLines={2}>{texto}</TextoChip>
    </Chip>
  );
}

/**
 * Fila de mensajes sugeridos arriba de la caja del chat (spec 11). Tocar uno lo pasa a
 * `onElegir` (completa el campo, no envía). "Ocultar sugerencias" las saca de la pantalla.
 */
export function SugerenciasChat({ sugerencias, onElegir, onOcultar }) {
  const theme = useTheme();
  if (!sugerencias?.length) return null;
  return (
    <Contenedor
      accessibilityRole="none"
      accessibilityLabel="Mensajes sugeridos"
      testID="sugerencias-chat"
    >
      <Encabezado>
        <Sparkles size={14} color={theme.colors.accentText} accessible={false} />
        <Titulo>Mensajes sugeridos</Titulo>
        <Ocultar
          onPress={onOcultar}
          accessibilityRole="button"
          accessibilityLabel="Ocultar sugerencias"
          hitSlop={8}
          testID="ocultar-sugerencias"
        >
          <X size={16} color={theme.colors.textSecondary} accessible={false} />
        </Ocultar>
      </Encabezado>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
      >
        {sugerencias.map((texto, i) => (
          <ChipSugerencia key={texto} texto={texto} indice={i} onPress={onElegir} />
        ))}
      </ScrollView>
    </Contenedor>
  );
}

const Contenedor = styled.View`
  gap: 6px;
  padding-top: 8px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.background};
`;

const Encabezado = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 16px;
`;

const Titulo = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Ocultar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const Chip = styled.Pressable`
  max-width: 260px;
  min-height: 44px;
  justify-content: center;
  padding: 8px 14px;
  border-radius: 22px;
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.borderInput};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const TextoChip = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default SugerenciasChat;
