import { useId, useRef, useState } from "react";
import { FlatList } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { Check, ChevronDown } from "lucide-react-native";
import { Campo, MarcoControl } from "./Campo";
import { Modal } from "./Modal";
import { useFoco } from "./foco";

/**
 * Selector con label visible. Abre un modal con la lista de opciones [{ valor, etiqueta }].
 */
export function Select({
  label,
  opciones = [],
  valor,
  onCambiar,
  placeholder = "Elegí una opción",
  requerido,
  error,
  ayuda,
  disabled = false,
}) {
  const theme = useTheme();
  const id = useId();
  const disparador = useRef(null);
  const [abierto, setAbierto] = useState(false);
  const { enfocado, propsFoco } = useFoco();
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <Campo label={label} requerido={requerido} error={error} ayuda={ayuda} nativeID={`label-${id}`}>
      <Disparador
        ref={disparador}
        onPress={() => setAbierto(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${elegida?.etiqueta ?? "sin elegir"}`}
        accessibilityHint="Abre la lista de opciones"
        accessibilityState={{ disabled, expanded: abierto }}
        {...propsFoco}
      >
        <MarcoControl $enfocado={enfocado} $error={Boolean(error)}>
          <Valor $placeholder={!elegida} numberOfLines={1}>
            {elegida?.etiqueta ?? placeholder}
          </Valor>
          <IconoCaja>
            <ChevronDown size={20} color={theme.colors.textSecondary} accessible={false} />
          </IconoCaja>
        </MarcoControl>
      </Disparador>
      <Modal
        visible={abierto}
        alCerrar={() => setAbierto(false)}
        titulo={label}
        refDisparador={disparador}
      >
        <FlatList
          data={opciones}
          keyExtractor={(o) => String(o.valor)}
          renderItem={({ item }) => {
            const seleccionada = item.valor === valor;
            return (
              <Opcion
                onPress={() => {
                  onCambiar?.(item.valor);
                  setAbierto(false);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: seleccionada, checked: seleccionada }}
                $seleccionada={seleccionada}
              >
                <TextoOpcion $seleccionada={seleccionada}>{item.etiqueta}</TextoOpcion>
                {seleccionada ? (
                  <Check size={18} color={theme.colors.accentText} accessible={false} />
                ) : null}
              </Opcion>
            );
          }}
        />
      </Modal>
    </Campo>
  );
}

const Disparador = styled.Pressable``;

const Valor = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme, $placeholder }) =>
    $placeholder ? theme.colors.textMuted : theme.colors.textPrimary};
`;

const IconoCaja = styled.View`
  width: 44px;
  align-items: center;
`;

const Opcion = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme, $seleccionada }) =>
    $seleccionada ? theme.colors.surfaceSubtle : "transparent"};
`;

const TextoOpcion = styled.Text`
  font-family: ${({ theme, $seleccionada }) =>
    $seleccionada ? theme.typography.fontBodySemibold : theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default Select;
