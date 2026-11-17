import styled, { useTheme } from "styled-components/native";
import { Star, StarHalf } from "lucide-react-native";

const formatear = (v) => String(v).replace(".", ",");

/**
 * Estrellas de 0 a 5 en pasos de 0,5. De solo lectura, o como input (`onCambiar`): cada estrella
 * tiene dos mitades tocables, y para lectores de pantalla es un control "ajustable".
 */
export function Rating({ valor = 0, onCambiar, tamanio = 20, cantidad }) {
  const theme = useTheme();
  const editable = Boolean(onCambiar);
  const color = theme.colors.gold;

  const estrellas = [1, 2, 3, 4, 5].map((n) => {
    const llena = valor >= n;
    const media = !llena && valor >= n - 0.5;
    return (
      <Estrella key={n}>
        {media ? (
          <>
            <Capa>
              <Star
                size={tamanio}
                color={theme.colors.divider}
                fill="transparent"
                accessible={false}
              />
            </Capa>
            <StarHalf size={tamanio} color={color} fill={color} accessible={false} />
          </>
        ) : (
          <Star
            size={tamanio}
            color={llena ? color : theme.colors.borderInput}
            fill={llena ? color : "transparent"}
            accessible={false}
          />
        )}
        {editable ? (
          <Mitades>
            <Mitad onPress={() => onCambiar(n - 0.5)} accessible={false} />
            <Mitad onPress={() => onCambiar(n)} accessible={false} />
          </Mitades>
        ) : null}
      </Estrella>
    );
  });

  if (!editable) {
    return (
      <Fila
        accessible
        accessibilityLabel={`${formatear(valor)} de 5 estrellas${cantidad != null ? `, ${cantidad} reseñas` : ""}`}
      >
        {estrellas}
        {cantidad != null ? <Cantidad>({cantidad})</Cantidad> : null}
      </Fila>
    );
  }

  return (
    <Fila
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Puntuación"
      accessibilityValue={{
        min: 1,
        max: 5,
        now: valor,
        text: `${formatear(valor)} de 5 estrellas`,
      }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "increment") onCambiar(Math.min(5, (valor || 0.5) + 0.5));
        if (nativeEvent.actionName === "decrement") onCambiar(Math.max(1, valor - 0.5));
      }}
      $editable
    >
      {estrellas}
    </Fila>
  );
}

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: ${({ $editable }) => ($editable ? 6 : 2)}px;
`;

const Estrella = styled.View`
  position: relative;
  min-width: ${({ theme }) => theme.tactil / 2}px;
  align-items: center;
  justify-content: center;
`;

const Capa = styled.View`
  position: absolute;
`;

const Mitades = styled.View`
  position: absolute;
  top: -12px;
  bottom: -12px;
  left: -4px;
  right: -4px;
  flex-direction: row;
`;

const Mitad = styled.Pressable`
  flex: 1;
`;

const Cantidad = styled.Text`
  margin-left: 6px;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default Rating;
