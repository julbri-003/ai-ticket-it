import styled from "styled-components/native";

/** Separador "Hoy", "Ayer" o la fecha entre los mensajes de distintos días. */
export function SeparadorDia({ texto }) {
  return (
    <Fila accessibilityRole="header" accessible accessibilityLabel={texto}>
      <Linea />
      <Texto>{texto}</Texto>
      <Linea />
    </Fila>
  );
}

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
`;

const Linea = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.divider};
`;

const Texto = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default SeparadorDia;
