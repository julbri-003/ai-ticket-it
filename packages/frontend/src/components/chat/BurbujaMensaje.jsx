import styled, { useTheme } from "styled-components/native";
import { AlertCircle, Clock } from "lucide-react-native";

/**
 * Burbuja del chat. Las propias van a la derecha en el color primario; las del otro a la
 * izquierda con su nombre y rol. Un mensaje optimista muestra "Enviando…"; si falló, "No se
 * envió · Reintentar" (botón).
 */
export function BurbujaMensaje({ mensaje, onReintentar }) {
  const theme = useTheme();
  const { propio, estado } = mensaje;
  const etiqueta = `${propio ? "Vos" : `${mensaje.autor}, ${mensaje.rolTexto}`}, ${mensaje.horaTexto}: ${mensaje.texto}${
    estado === "enviando" ? ". Enviando" : estado === "error" ? ". No se envió" : ""
  }`;
  return (
    <Fila $propio={propio} testID={`mensaje-${mensaje.id}`}>
      <Burbuja
        $propio={propio}
        $error={estado === "error"}
        accessible
        accessibilityLabel={etiqueta}
      >
        {!propio ? (
          <Autor>
            {mensaje.autor} · {mensaje.rolTexto}
          </Autor>
        ) : null}
        <Texto $propio={propio}>{mensaje.texto}</Texto>
        <Pie>
          {estado === "enviando" ? (
            <Clock size={12} color={theme.colors.onPrimary} accessible={false} />
          ) : null}
          <Hora $propio={propio}>{estado === "enviando" ? "Enviando…" : mensaje.horaTexto}</Hora>
        </Pie>
      </Burbuja>
      {estado === "error" ? (
        <Reintentar
          onPress={() => onReintentar?.(mensaje.id)}
          accessibilityRole="button"
          accessibilityLabel={`Reintentar enviar: ${mensaje.texto}`}
          testID={`reintentar-${mensaje.id}`}
        >
          <AlertCircle size={14} color={theme.colors.error} accessible={false} />
          <TextoError>No se envió · Reintentar</TextoError>
        </Reintentar>
      ) : null}
    </Fila>
  );
}

const Fila = styled.View`
  align-items: ${({ $propio }) => ($propio ? "flex-end" : "flex-start")};
  gap: 4px;
`;

const Burbuja = styled.View`
  max-width: 82%;
  padding: 10px 14px;
  gap: 4px;
  border-radius: 18px;
  border-bottom-right-radius: ${({ $propio }) => ($propio ? 4 : 18)}px;
  border-bottom-left-radius: ${({ $propio }) => ($propio ? 18 : 4)}px;
  background-color: ${({ theme, $propio }) =>
    $propio ? theme.colors.primary : theme.colors.surface};
  border-width: ${({ $propio, $error }) => ($error ? 2 : $propio ? 0 : 1)}px;
  border-color: ${({ theme, $error }) => ($error ? theme.colors.error : theme.colors.divider)};
  opacity: ${({ $error }) => ($error ? 0.8 : 1)};
`;

const Autor = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Texto = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 22px;
  color: ${({ theme, $propio }) => ($propio ? theme.colors.onPrimary : theme.colors.textPrimary)};
`;

const Pie = styled.View`
  flex-direction: row;
  align-items: center;
  align-self: flex-end;
  gap: 4px;
`;

const Hora = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  color: ${({ theme, $propio }) => ($propio ? theme.colors.onPrimary : theme.colors.textMuted)};
`;

const Reintentar = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 4px;
`;

const TextoError = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.error};
`;

export default BurbujaMensaje;
