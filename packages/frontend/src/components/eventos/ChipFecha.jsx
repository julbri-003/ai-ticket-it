import styled from "styled-components/native";
import { DECORATIVO } from "../ui/Teatro";

/**
 * Chip de talón sobre la imagen de un evento: día grande en Playfair y mes en versalitas
 * ("22 / NOV"). Decorativo: la fecha ya está en el label de la tarjeta. `chico` para miniaturas.
 */
export function ChipFecha({ dia, mes, chico = false, testID }) {
  if (!dia) return null;
  return (
    <Chip {...DECORATIVO} testID={testID} $chico={chico}>
      <Dia $chico={chico}>{dia}</Dia>
      <Mes $chico={chico}>{mes}</Mes>
    </Chip>
  );
}

const Chip = styled.View`
  position: absolute;
  top: ${({ $chico }) => ($chico ? 4 : 10)}px;
  left: ${({ $chico }) => ($chico ? 4 : 10)}px;
  min-width: ${({ $chico }) => ($chico ? 34 : 52)}px;
  padding: ${({ $chico }) => ($chico ? "2px 5px" : "6px 10px")};
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.ticketStub};
`;

const Dia = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme, $chico }) =>
    $chico ? theme.typography.sizes.body : theme.typography.sizes.title}px;
  line-height: ${({ $chico }) => ($chico ? 18 : 26)}px;
  color: ${({ theme }) => theme.colors.onTicketStub};
`;

const Mes = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme, $chico }) => ($chico ? 9 : theme.typography.sizes.label)}px;
  letter-spacing: ${({ $chico }) => ($chico ? 1 : 1.5)}px;
  color: ${({ theme }) => theme.colors.onTicketStub};
`;

export default ChipFecha;
