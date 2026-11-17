import { ScrollView } from "react-native";
import styled from "styled-components/native";
import { useFoco } from "./foco";

function Segmento({ etiqueta, contador, seleccionado, onPress }) {
  const { enfocado, propsFoco } = useFoco();
  return (
    <Opcion
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={contador != null ? `${etiqueta}, ${contador}` : etiqueta}
      accessibilityState={{ selected: seleccionado }}
      $seleccionado={seleccionado}
      $enfocado={enfocado}
      {...propsFoco}
    >
      <Texto $seleccionado={seleccionado}>{etiqueta}</Texto>
      {contador != null ? (
        <Contador $seleccionado={seleccionado}>
          <TextoContador $seleccionado={seleccionado}>{contador}</TextoContador>
        </Contador>
      ) : null}
    </Opcion>
  );
}

/** Control segmentado en pills (con contador opcional), desplazable si no entra. */
export function Segmentos({ opciones, valor, onCambiar, etiqueta }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      accessibilityRole="tablist"
      accessibilityLabel={etiqueta}
    >
      <Fila>
        {opciones.map((o) => (
          <Segmento
            key={String(o.valor)}
            etiqueta={o.etiqueta}
            contador={o.contador}
            seleccionado={o.valor === valor}
            onPress={() => onCambiar(o.valor)}
          />
        ))}
      </Fila>
    </ScrollView>
  );
}

const Fila = styled.View`
  flex-direction: row;
  gap: 8px;
  padding: 2px;
`;

const Opcion = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.primary : theme.colors.surfaceSubtle};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $seleccionado, $enfocado }) =>
    $enfocado
      ? theme.colors.focusRing
      : $seleccionado
        ? theme.colors.primary
        : theme.colors.divider};
`;

const Texto = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.onPrimary : theme.colors.textSecondary};
`;

const Contador = styled.View`
  min-width: 22px;
  padding: 1px 6px;
  border-radius: 11px;
  align-items: center;
  background-color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.surface : theme.colors.background};
`;

const TextoContador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default Segmentos;
