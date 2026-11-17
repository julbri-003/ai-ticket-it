import { useEffect, useRef } from "react";
import { Animated } from "react-native";
import styled, { useTheme } from "styled-components/native";

/** Bloque con brillo animado (shimmer) mientras carga. */
export function Skeleton({ ancho = "100%", alto = 16, radio = 8 }) {
  const theme = useTheme();
  const brillo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animacion = Animated.loop(
      Animated.sequence([
        Animated.timing(brillo, { toValue: 1, duration: 800, useNativeDriver: false }),
        Animated.timing(brillo, { toValue: 0, duration: 800, useNativeDriver: false }),
      ]),
    );
    animacion.start();
    return () => animacion.stop();
  }, [brillo]);

  const backgroundColor = brillo.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.colors.skeleton, theme.colors.skeletonBrillo],
  });

  return (
    <Animated.View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: ancho, height: alto, borderRadius: radio, backgroundColor }}
    />
  );
}

/** Contenedor anunciado como "Cargando" para los presets. */
function Cargando({ children, etiqueta = "Cargando" }) {
  return (
    <Grupo
      accessible
      accessibilityLabel={etiqueta}
      accessibilityState={{ busy: true }}
      testID="skeleton"
    >
      {children}
    </Grupo>
  );
}

export function SkeletonCard() {
  return (
    <Cargando etiqueta="Cargando evento">
      <Tarjeta>
        <Skeleton alto={150} radio={12} />
        <Skeleton ancho="70%" alto={20} />
        <Skeleton ancho="45%" />
        <Skeleton ancho="30%" />
      </Tarjeta>
    </Cargando>
  );
}

export function SkeletonLista({ cantidad = 4 }) {
  return (
    <Cargando etiqueta="Cargando lista">
      {Array.from({ length: cantidad }, (_, i) => (
        <Fila key={i}>
          <Skeleton ancho={56} alto={56} radio={12} />
          <Columna>
            <Skeleton ancho="80%" />
            <Skeleton ancho="50%" />
          </Columna>
        </Fila>
      ))}
    </Cargando>
  );
}

export function SkeletonDetalle() {
  return (
    <Cargando etiqueta="Cargando detalle">
      <Skeleton alto={220} radio={18} />
      <Skeleton ancho="85%" alto={28} />
      <Skeleton ancho="60%" />
      <Skeleton alto={90} radio={12} />
      <Skeleton alto={90} radio={12} />
    </Cargando>
  );
}

const Grupo = styled.View`
  gap: 12px;
`;

const Tarjeta = styled.View`
  gap: 10px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const Fila = styled.View`
  flex-direction: row;
  gap: 12px;
  align-items: center;
`;

const Columna = styled.View`
  flex: 1;
  gap: 8px;
`;

export default Skeleton;
