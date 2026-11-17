import styled, { useTheme } from "styled-components/native";
import { ESTADOS_COMPRA } from "../ui";

/** Historial de la compra: cada cambio con ícono del estado, fecha y hora, quién y el detalle. */
export function TimelineEstados({ historial }) {
  const theme = useTheme();
  return (
    <Lista accessibilityLabel="Historial de la compra">
      {historial.map((cambio, i) => {
        const Icono = ESTADOS_COMPRA[cambio.estado]?.icono;
        const colores = theme.colors.estados[cambio.estado];
        const ultimo = i === historial.length - 1;
        return (
          <Paso
            key={cambio.id}
            accessible
            accessibilityLabel={`${cambio.estadoTexto}, ${cambio.fechaTexto}, por ${cambio.quienTexto}. ${cambio.detalle}`}
            testID="paso-timeline"
          >
            <Riel>
              <Circulo $fondo={colores?.fondo} $borde={colores?.texto}>
                {Icono ? <Icono size={16} color={colores?.texto} accessible={false} /> : null}
              </Circulo>
              {!ultimo ? <Linea /> : null}
            </Riel>
            <Contenido>
              <Estado $color={colores?.texto}>{cambio.estadoTexto}</Estado>
              <Meta>
                {cambio.fechaTexto} · {cambio.quienTexto}
              </Meta>
              {cambio.detalle ? <Detalle>{cambio.detalle}</Detalle> : null}
            </Contenido>
          </Paso>
        );
      })}
    </Lista>
  );
}

const Lista = styled.View``;

const Paso = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const Riel = styled.View`
  align-items: center;
  width: 36px;
`;

const Circulo = styled.View`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  align-items: center;
  justify-content: center;
  background-color: ${({ $fondo }) => $fondo};
  border-width: 1.5px;
  border-color: ${({ $borde }) => $borde};
`;

const Linea = styled.View`
  flex: 1;
  width: 2px;
  min-height: 16px;
  background-color: ${({ theme }) => theme.colors.divider};
`;

const Contenido = styled.View`
  flex: 1;
  padding-bottom: 18px;
  gap: 2px;
`;

const Estado = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ $color }) => $color};
`;

const Meta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Detalle = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default TimelineEstados;
