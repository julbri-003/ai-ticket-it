import styled from "styled-components/native";

/** Barra de ocupación (vendidas / cupo), con el dato también en texto. */
export function BarraOcupacion({ vendidas, cupo, etiqueta = "Ocupación" }) {
  const proporcion = cupo ? Math.min(1, vendidas / cupo) : 0;
  const porcentaje = Math.round(proporcion * 100);
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
        <Relleno style={{ width: `${porcentaje}%` }} $completo={proporcion >= 1} />
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

const Relleno = styled.View`
  height: 8px;
  border-radius: 4px;
  background-color: ${({ theme, $completo }) =>
    $completo ? theme.colors.success : theme.colors.primary};
`;

export default BarraOcupacion;
