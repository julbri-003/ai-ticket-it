import { ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { useFoco } from "./foco";

const TAMANIOS = {
  sm: { vertical: 8, horizontal: 16, fuente: "bodySm", icono: 16 },
  md: { vertical: 12, horizontal: 24, fuente: "bodySm", icono: 18 },
  lg: { vertical: 16, horizontal: 28, fuente: "body", icono: 20 },
};

/** Colores de cada variante: fondo, texto y borde. */
function colores(variant, { colors }) {
  switch (variant) {
    case "secondary":
      return { fondo: colors.secondary, texto: colors.onSecondary, borde: colors.secondary };
    case "outline":
      return { fondo: "transparent", texto: colors.textPrimary, borde: colors.borderInput };
    case "ghost":
      return { fondo: "transparent", texto: colors.accentText, borde: "transparent" };
    case "invertido": // sobre terciopelo (banner final de la landing)
      return { fondo: colors.onVelvet, texto: colors.velvet, borde: colors.onVelvet };
    case "danger":
      return { fondo: colors.error, texto: colors.onError, borde: colors.error };
    default:
      return { fondo: colors.primary, texto: colors.onPrimary, borde: colors.primary };
  }
}

/**
 * Botón pill (misma API que REPO_REF): variant primary | secondary | outline | ghost | danger | invertido,
 * size sm | md | lg, loading (deshabilita y marca busy), icono (componente de lucide).
 * Si el botón es solo ícono, `accessibilityLabel` es obligatorio.
 */
export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icono: Icono,
  iconoDerecha: IconoDerecha,
  bloque = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  ...resto
}) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco(resto);
  const c = colores(variant, theme);
  const t = TAMANIOS[size] ?? TAMANIOS.md;
  const inactivo = disabled || loading;
  const etiqueta = accessibilityLabel ?? (typeof children === "string" ? children : undefined);

  return (
    <Base
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactivo, busy: loading }}
      testID={testID}
      {...propsFoco}
      $fondo={c.fondo}
      $borde={enfocado ? theme.colors.focusRing : c.borde}
      $enfocado={enfocado}
      $t={t}
      $bloque={bloque}
      $inactivo={inactivo}
      style={({ pressed }) => ({ opacity: inactivo ? 0.55 : pressed ? 0.85 : 1 })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.texto} accessibilityElementsHidden />
      ) : Icono ? (
        <Icono size={t.icono} color={c.texto} strokeWidth={1.75} accessible={false} />
      ) : null}
      {children ? (
        <Texto $color={c.texto} $t={t} numberOfLines={2}>
          {children}
        </Texto>
      ) : null}
      {IconoDerecha && !loading ? (
        <IconoDerecha size={t.icono} color={c.texto} strokeWidth={1.75} accessible={false} />
      ) : null}
    </Base>
  );
}

const Base = styled.Pressable`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: ${({ theme }) => theme.tactil}px;
  min-width: ${({ theme }) => theme.tactil}px;
  padding: ${({ $t }) => `${$t.vertical}px ${$t.horizontal}px`};
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ $fondo }) => $fondo};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1.5)}px;
  border-color: ${({ $borde }) => $borde};
  ${({ $bloque }) => ($bloque ? "align-self: stretch;" : "align-self: flex-start;")}
`;

const Texto = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme, $t }) => theme.typography.sizes[$t.fuente]}px;
  color: ${({ $color }) => $color};
  text-align: center;
`;

export default Button;
