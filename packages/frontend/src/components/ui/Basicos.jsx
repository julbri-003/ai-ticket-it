import { ActivityIndicator } from "react-native";
import styled, { useTheme } from "styled-components/native";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  RotateCcw,
  Ticket,
  XCircle,
} from "lucide-react-native";
import { Button } from "./Button";
import { useFoco } from "./foco";
import { ETIQUETAS_ESTADO } from "../../utils/estadosCompra";

// ----- Card -----

/** Contenedor con superficie, borde y radio grande. Con `onPress` es interactivo. */
export function Card({ children, onPress, accessibilityLabel, ...resto }) {
  const { enfocado, propsFoco } = useFoco();
  if (!onPress) return <CardBase {...resto}>{children}</CardBase>;
  return (
    <CardPresionable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      $enfocado={enfocado}
      {...propsFoco}
      {...resto}
    >
      {children}
    </CardPresionable>
  );
}

const CardBase = styled.View`
  padding: 16px;
  gap: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const CardPresionable = styled.Pressable`
  padding: 16px;
  gap: 8px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.divider};
`;

// ----- Badge -----

const VARIANTES_BADGE = {
  neutral: ({ colors }) => ({ texto: colors.textSecondary, fondo: colors.surfaceSubtle }),
  primary: ({ colors }) => ({ texto: colors.accentText, fondo: colors.surfaceSubtle }),
  gold: ({ colors }) => ({ texto: colors.gold, fondo: colors.surfaceSubtle }),
  success: ({ colors }) => ({
    texto: colors.estados.CONFIRMADA.texto,
    fondo: colors.estados.CONFIRMADA.fondo,
  }),
  warning: ({ colors }) => ({
    texto: colors.estados.PENDIENTE.texto,
    fondo: colors.estados.PENDIENTE.fondo,
  }),
  error: ({ colors }) => ({
    texto: colors.estados.CANCELADA.texto,
    fondo: colors.estados.CANCELADA.fondo,
  }),
  info: ({ colors }) => ({
    texto: colors.estados.UTILIZADA.texto,
    fondo: colors.estados.UTILIZADA.fondo,
  }),
};

/** Pill con fondo tintado + texto del mismo tono (+ ícono opcional). */
export function Badge({
  children,
  variant = "neutral",
  icono: Icono,
  colores,
  accessibilityLabel,
}) {
  const theme = useTheme();
  const c = colores ?? (VARIANTES_BADGE[variant] ?? VARIANTES_BADGE.neutral)(theme);
  return (
    <Pill $fondo={c.fondo} accessibilityLabel={accessibilityLabel} accessible>
      {Icono ? <Icono size={14} color={c.texto} strokeWidth={2} accessible={false} /> : null}
      <TextoPill $color={c.texto}>{children}</TextoPill>
    </Pill>
  );
}

const Pill = styled.View`
  flex-direction: row;
  align-items: center;
  align-self: flex-start;
  gap: 6px;
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ $fondo }) => $fondo};
`;

const TextoPill = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ $color }) => $color};
`;

/** Pill de evento cancelado (ícono + texto, nunca solo color). */
export function EventoCanceladoBadge() {
  return (
    <Badge variant="error" icono={Ban}>
      Cancelado
    </Badge>
  );
}

// ----- EstadoCompraBadge -----

export const ESTADOS_COMPRA = {
  PENDIENTE: { etiqueta: ETIQUETAS_ESTADO.PENDIENTE, icono: Clock },
  CONFIRMADA: { etiqueta: ETIQUETAS_ESTADO.CONFIRMADA, icono: CheckCircle2 },
  UTILIZADA: { etiqueta: ETIQUETAS_ESTADO.UTILIZADA, icono: Ticket },
  CANCELADA: { etiqueta: ETIQUETAS_ESTADO.CANCELADA, icono: XCircle },
  REEMBOLSADA: { etiqueta: ETIQUETAS_ESTADO.REEMBOLSADA, icono: RotateCcw },
};

/** Estado de una compra: color, ícono y texto (nunca solo color). */
export function EstadoCompraBadge({ estado }) {
  const theme = useTheme();
  const info = ESTADOS_COMPRA[estado] ?? { etiqueta: estado, icono: AlertTriangle };
  const colores = theme.colors.estados[estado] ?? VARIANTES_BADGE.neutral(theme);
  return (
    <Badge colores={colores} icono={info.icono} accessibilityLabel={`Estado: ${info.etiqueta}`}>
      {info.etiqueta}
    </Badge>
  );
}

// ----- Chip -----

/** Filtro seleccionable (pill). */
export function Chip({ etiqueta, seleccionado = false, onPress, icono: Icono }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  const color = seleccionado ? theme.colors.onPrimary : theme.colors.textSecondary;
  return (
    <ChipBase
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ selected: seleccionado }}
      $seleccionado={seleccionado}
      $enfocado={enfocado}
      {...propsFoco}
    >
      {Icono ? <Icono size={16} color={color} accessible={false} /> : null}
      <TextoChip $color={color}>{etiqueta}</TextoChip>
    </ChipBase>
  );
}

const ChipBase = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 6px;
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

const TextoChip = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ $color }) => $color};
`;

// ----- Spinner -----

export function Spinner({ etiqueta = "Cargando", tamanio = "large" }) {
  const theme = useTheme();
  return (
    <CentroSpinner
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator size={tamanio} color={theme.colors.accentText} />
    </CentroSpinner>
  );
}

const CentroSpinner = styled.View`
  padding: 24px;
  align-items: center;
  justify-content: center;
`;

// ----- EmptyState / ErrorState -----

/** Estado vacío: ícono, título, mensaje y una acción opcional. */
export function EmptyState({ icono: Icono, titulo, mensaje, accion }) {
  const theme = useTheme();
  return (
    <Estado>
      {Icono ? (
        <Icono size={44} color={theme.colors.goldOrnament} strokeWidth={1.5} accessible={false} />
      ) : null}
      <TituloEstado accessibilityRole="header">{titulo}</TituloEstado>
      {mensaje ? <MensajeEstado>{mensaje}</MensajeEstado> : null}
      {accion ? <Button onPress={accion.alPresionar}>{accion.etiqueta}</Button> : null}
    </Estado>
  );
}

/** Error con reintento. */
export function ErrorState({
  titulo = "No pudimos cargar esto",
  mensaje = "Revisá tu conexión e intentá de nuevo.",
  alReintentar,
}) {
  const theme = useTheme();
  return (
    <Estado accessibilityRole="alert">
      <AlertTriangle size={44} color={theme.colors.error} strokeWidth={1.5} accessible={false} />
      <TituloEstado accessibilityRole="header">{titulo}</TituloEstado>
      <MensajeEstado>{mensaje}</MensajeEstado>
      {alReintentar ? (
        <Button variant="outline" icono={RotateCcw} onPress={alReintentar}>
          Reintentar
        </Button>
      ) : null}
    </Estado>
  );
}

const Estado = styled.View`
  align-items: center;
  gap: 12px;
  padding: 32px 16px;
`;

const TituloEstado = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
  text-align: center;
`;

const MensajeEstado = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;
