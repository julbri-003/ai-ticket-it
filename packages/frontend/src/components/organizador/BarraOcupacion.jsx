import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";

/**
 * Barra de ocupación (vendidas / cupo), con el dato también en texto. La primera vez el relleno
 * se llena de 0 al valor en 800 ms (scaleX, driver nativo); el texto y el accessibilityValue
 * siempre muestran el valor final. Con "Reducir movimiento" se muestra lleno de entrada.
 */
export function BarraOcupacion({ vendidas, cupo, etiqueta = "Ocupación" }) {
  const proporcion = cupo ? Math.min(1, vendidas / cupo) : 0;
  const porcentaje = Math.round(proporcion * 100);
  const reducido = useMovimientoReducido();
  const escala = useRef(new Animated.Value(0)).current;
  const lleno = useRef(false);

  useEffect(() => {
    if (reducido == null) return;
    if (lleno.current || reducido) {
      lleno.current = true;
      escala.setValue(proporcion);
      return;
    }
    lleno.current = true;
    Animated.timing(escala, {
      toValue: proporcion,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reducido, proporcion, escala]);

  return (
    <Contenedor
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${etiqueta}: ${vendidas} de ${cupo} vendidas`}
      accessibilityValue={{ min: 0, max: cupo, now: vendidas }}
    >
      <Fila>
        <Etiqueta>{etiqueta}</Etiqueta>
        <Etiqueta>
          {vendidas}/{cupo} · {porcentaje}%
        </Etiqueta>
      </Fila>
      <Pista>
        <Relleno
          testID="relleno-ocupacion"
          style={{ transform: [{ scaleX: escala }], transformOrigin: "left" }}
          $completo={proporcion >= 1}
        />
      </Pista>
    </Contenedor>
  );
}

const Contenedor = styled.View`
  gap: 4px;
`;

const Fila = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const Etiqueta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Pista = styled.View`
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const Relleno = styled(Animated.View)`
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme, $completo }) =>
    $completo ? theme.colors.success : theme.colors.primary};
`;

export default BarraOcupacion;
