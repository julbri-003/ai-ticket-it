import { forwardRef } from "react";
import styled from "styled-components/native";
import { Input } from "./Input";

/** Texto largo: Input multilínea con contador de caracteres si hay `maxLength`. */
export const Textarea = forwardRef(function Textarea(
  { value = "", maxLength, lineas = 4, ...resto },
  ref,
) {
  return (
    <Input
      ref={ref}
      multiline
      value={value}
      maxLength={maxLength}
      numberOfLines={lineas}
      textAlignVertical="top"
      style={{ minHeight: lineas * 22 }}
      extraLabel={
        maxLength ? (
          <Contador accessibilityLabel={`${value.length} de ${maxLength} caracteres`}>
            {value.length}/{maxLength}
          </Contador>
        ) : null
      }
      {...resto}
    />
  );
});

const Contador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default Textarea;
