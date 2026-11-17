import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import styled, { useTheme } from "styled-components/native";
import { Check, CheckCheck } from "lucide-react-native";
import { useFoco } from "../ui/foco";

/** Acción que aparece al deslizar una no leída hacia la izquierda. */
function AccionLeida({ onPress, id }) {
  const theme = useTheme();
  return (
    <Accion
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Marcar como leída"
      testID={`swipe-leida-${id}`}
    >
      <CheckCheck size={22} color={theme.colors.onPrimary} accessible={false} />
      <TextoAccion>Leída</TextoAccion>
    </Accion>
  );
}

/**
 * Notificación de la lista. Tocarla la abre (y la marca leída). Una no leída se marca leída sin
 * abrirla deslizándola a la izquierda, con el check o con la acción accesible.
 */
export function ItemNotificacion({ notificacion: n, onAbrir, onMarcarLeida }) {
  const theme = useTheme();
  const foco = useFoco();
  const focoCheck = useFoco();

  const contenido = (
    <Tarjeta $leida={n.leida} testID={`notificacion-${n.id}`}>
      <Cuerpo
        onPress={() => onAbrir(n)}
        accessibilityRole="button"
        accessibilityLabel={`${n.leida ? "" : "No leída. "}${n.titulo}. ${n.mensaje}. ${n.fechaTexto}`}
        accessibilityHint={n.destino ? "Abre la compra o el evento" : undefined}
        accessibilityActions={n.leida ? undefined : [{ name: "leida", label: "Marcar como leída" }]}
        onAccessibilityAction={(e) => e.nativeEvent.actionName === "leida" && onMarcarLeida(n)}
        $enfocado={foco.enfocado}
        testID={`abrir-notificacion-${n.id}`}
        {...foco.propsFoco}
      >
        <Fila>
          {!n.leida ? <Punto accessible={false} /> : null}
          <Titulo $leida={n.leida}>{n.titulo}</Titulo>
          <Fecha>{n.fechaTexto}</Fecha>
        </Fila>
        <Mensaje $leida={n.leida}>{n.mensaje}</Mensaje>
      </Cuerpo>
      {!n.leida ? (
        <BotonCheck
          onPress={() => onMarcarLeida(n)}
          accessibilityRole="button"
          accessibilityLabel={`Marcar como leída: ${n.titulo}`}
          $enfocado={focoCheck.enfocado}
          testID={`marcar-leida-${n.id}`}
          {...focoCheck.propsFoco}
        >
          <Check size={20} color={theme.colors.accentText} accessible={false} />
        </BotonCheck>
      ) : null}
    </Tarjeta>
  );

  if (n.leida) return contenido;
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={60}
      overshootRight={false}
      renderRightActions={() => <AccionLeida id={n.id} onPress={() => onMarcarLeida(n)} />}
      onSwipeableOpen={() => onMarcarLeida(n)}
    >
      {contenido}
    </ReanimatedSwipeable>
  );
}

const Tarjeta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
  border-left-width: ${({ $leida }) => ($leida ? 1 : 4)}px;
  border-left-color: ${({ theme, $leida }) =>
    $leida ? theme.colors.divider : theme.colors.primary};
  background-color: ${({ theme, $leida }) =>
    $leida ? theme.colors.surface : theme.colors.surfaceSubtle};
`;

const Cuerpo = styled.Pressable`
  flex: 1;
  gap: 6px;
  padding: 14px 4px 14px 16px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  border-width: 2px;
  border-color: ${({ theme, $enfocado }) => ($enfocado ? theme.colors.focusRing : "transparent")};
`;

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Punto = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const Titulo = styled.Text`
  flex: 1;
  font-family: ${({ theme, $leida }) =>
    $leida ? theme.typography.fontBodyMedium : theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Fecha = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Mensaje = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 20px;
  color: ${({ theme, $leida }) => ($leida ? theme.colors.textSecondary : theme.colors.textPrimary)};
`;

const BotonCheck = styled.Pressable`
  width: 44px;
  height: 44px;
  margin-right: 8px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const Accion = styled.Pressable`
  width: 96px;
  margin-left: 12px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoAccion = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.onPrimary};
`;

export default ItemNotificacion;
