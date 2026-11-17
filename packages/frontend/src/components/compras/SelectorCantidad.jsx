import styled, { useTheme } from "styled-components/native";
import { Minus, Plus } from "lucide-react-native";

export const MAX_POR_COMPRA = 10;

/** Stepper de cantidad: de 1 a `maximo` (min(disponibles, 10)). */
export function SelectorCantidad({ valor, maximo, onCambiar }) {
  const theme = useTheme();
  const tope = Math.max(0, Math.min(maximo, MAX_POR_COMPRA));
  const puedeRestar = valor > 1;
  const puedeSumar = valor < tope;

  return (
    <Fila
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Cantidad de entradas"
      accessibilityValue={{ min: 1, max: tope, now: valor, text: `${valor} entradas` }}
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      onAccessibilityAction={({ nativeEvent }) => {
        if (nativeEvent.actionName === "increment" && puedeSumar) onCambiar(valor + 1);
        if (nativeEvent.actionName === "decrement" && puedeRestar) onCambiar(valor - 1);
      }}
      testID="selector-cantidad"
    >
      <Boton
        onPress={() => puedeRestar && onCambiar(valor - 1)}
        disabled={!puedeRestar}
        accessibilityRole="button"
        accessibilityLabel="Restar una entrada"
        accessibilityState={{ disabled: !puedeRestar }}
        $inactivo={!puedeRestar}
        testID="cantidad-restar"
      >
        <Minus size={20} color={theme.colors.textPrimary} accessible={false} />
      </Boton>
      <Valor testID="cantidad-valor">{valor}</Valor>
      <Boton
        onPress={() => puedeSumar && onCambiar(valor + 1)}
        disabled={!puedeSumar}
        accessibilityRole="button"
        accessibilityLabel="Sumar una entrada"
        accessibilityState={{ disabled: !puedeSumar }}
        $inactivo={!puedeSumar}
        testID="cantidad-sumar"
      >
        <Plus size={20} color={theme.colors.textPrimary} accessible={false} />
      </Boton>
      <Tope>máx. {tope}</Tope>
    </Fila>
  );
}

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
`;

const Boton = styled.Pressable`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  border-width: 1.5px;
  border-color: ${({ theme }) => theme.colors.borderInput};
  opacity: ${({ $inactivo }) => ($inactivo ? 0.4 : 1)};
`;

const Valor = styled.Text`
  min-width: 32px;
  text-align: center;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Tope = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default SelectorCantidad;
