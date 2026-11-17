import { forwardRef, useId, useState } from "react";
import styled, { useTheme } from "styled-components/native";
import { Eye, EyeOff } from "lucide-react-native";
import { Campo, MarcoControl } from "./Campo";
import { useFoco } from "./foco";

/**
 * Campo de texto con label visible obligatorio. `requerido` agrega *, `error` muestra el mensaje
 * debajo (anunciado), `ayuda` un texto de ayuda y `secure` oculta el texto con botón para verlo.
 */
export const Input = forwardRef(function Input(
  { label, requerido, error, ayuda, secure = false, icono: Icono, extraLabel, multiline, ...resto },
  ref,
) {
  const theme = useTheme();
  const id = useId();
  const { enfocado, propsFoco } = useFoco(resto);
  const [visible, setVisible] = useState(false);

  return (
    <Campo
      label={label}
      requerido={requerido}
      ayuda={ayuda}
      error={error}
      nativeID={`label-${id}`}
      extraLabel={extraLabel}
    >
      <MarcoControl $enfocado={enfocado} $error={Boolean(error)} $multilinea={multiline}>
        <Control
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`label-${id}`}
          accessibilityHint={error ?? ayuda}
          accessibilityState={{ disabled: resto.editable === false }}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secure && !visible}
          multiline={multiline}
          {...resto}
          {...propsFoco}
        />
        {secure ? (
          <BotonIcono
            onPress={() => setVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {visible ? (
              <EyeOff size={20} color={theme.colors.textSecondary} accessible={false} />
            ) : (
              <Eye size={20} color={theme.colors.textSecondary} accessible={false} />
            )}
          </BotonIcono>
        ) : Icono ? (
          <IconoDecorativo>
            <Icono size={20} color={theme.colors.textSecondary} accessible={false} />
          </IconoDecorativo>
        ) : null}
      </MarcoControl>
    </Campo>
  );
});

const Control = styled.TextInput`
  flex: 1;
  min-height: 44px;
  padding: 10px 0;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BotonIcono = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const IconoDecorativo = styled.View`
  width: 44px;
  align-items: center;
`;

export default Input;
