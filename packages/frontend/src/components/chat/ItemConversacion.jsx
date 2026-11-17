import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import styled from "styled-components/native";
import { Card, DECORATIVO, EstadoCompraBadge, ImagenEvento } from "../ui";
import { iniciales } from "../../utils/textos";

/**
 * Pulso único (1 → 1,15 → 1 en 300 ms) cuando sube la cantidad de no leídos (llegó un mensaje).
 * Sin bucles y quieto con "Reducir movimiento".
 */
function usePulso(valor, reducido) {
  const escala = useRef(new Animated.Value(1)).current;
  const anterior = useRef(valor);
  useEffect(() => {
    const subio = valor > anterior.current;
    anterior.current = valor;
    if (!subio || reducido !== false) return;
    Animated.sequence([
      Animated.timing(escala, {
        toValue: 1.15,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(escala, {
        toValue: 1,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [valor, reducido, escala]);
  return { transform: [{ scale: escala }] };
}

/**
 * Fila de la bandeja: imagen del evento con el avatar (iniciales) de la otra persona, con quién,
 * último mensaje, hora, no leídos y estado. Con mensajes sin leer lleva una cinta dorada a la
 * izquierda (además de la negrita y el contador) y el contador pulsa al llegar uno nuevo.
 */
export function ItemConversacion({ conversacion: c, onPress, reducido }) {
  const pulso = usePulso(c.noLeidos, reducido);
  const ultimo = `${c.ultimoMensaje.propio ? "Vos: " : ""}${c.ultimoMensaje.texto}`;
  const etiqueta = `${c.evento.nombre}, con ${c.otro.nombre} (${c.otro.rolTexto}). ${
    c.noLeidos > 0 ? `${c.noLeidos} sin leer. ` : ""
  }Último mensaje ${c.cuandoTexto}: ${ultimo}. Compra ${c.estadoTexto}`;
  return (
    <Card onPress={onPress} accessibilityLabel={etiqueta} testID={`conversacion-${c.compraId}`}>
      {c.noLeidos > 0 ? <Cinta {...DECORATIVO} testID={`cinta-${c.compraId}`} /> : null}
      <Fila>
        <Miniatura>
          <ImagenEvento
            uri={c.evento.imagen?.uri}
            alt={c.evento.imagen?.alt ?? c.evento.nombre}
            relacion={1}
          />
          <Avatar {...DECORATIVO} testID={`avatar-${c.compraId}`}>
            <TextoAvatar>{iniciales(c.otro.nombre)}</TextoAvatar>
          </Avatar>
        </Miniatura>
        <Datos>
          <FilaTitulo>
            <Nombre numberOfLines={1} $noLeido={c.noLeidos > 0}>
              {c.evento.nombre}
            </Nombre>
            <Hora>{c.cuandoTexto}</Hora>
          </FilaTitulo>
          <Secundario numberOfLines={1}>
            {c.otro.nombre} · {c.otro.rolTexto} · {c.detalleTexto}
          </Secundario>
          <FilaTitulo>
            <Ultimo numberOfLines={2} $noLeido={c.noLeidos > 0}>
              {ultimo}
            </Ultimo>
            {c.noLeidos > 0 ? (
              <Contador testID={`no-leidos-${c.compraId}`} style={pulso}>
                <TextoContador>{c.noLeidos > 99 ? "99+" : c.noLeidos}</TextoContador>
              </Contador>
            ) : null}
          </FilaTitulo>
          <EstadoCompraBadge estado={c.estado} />
        </Datos>
      </Fila>
    </Card>
  );
}

const Fila = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const Miniatura = styled.View`
  width: 64px;
`;

const Avatar = styled.View`
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 30px;
  height: 30px;
  border-radius: 15px;
  align-items: center;
  justify-content: center;
  border-width: 2px;
  border-color: ${({ theme }) => theme.colors.surface};
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoAvatar = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Cinta = styled.View`
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
  background-color: ${({ theme }) => theme.colors.goldOrnament};
`;

const Datos = styled.View`
  flex: 1;
  gap: 4px;
`;

const FilaTitulo = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`;

const Nombre = styled.Text`
  flex: 1;
  font-family: ${({ theme, $noLeido }) =>
    $noLeido ? theme.typography.fontBodySemibold : theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Hora = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Secundario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Ultimo = styled.Text`
  flex: 1;
  font-family: ${({ theme, $noLeido }) =>
    $noLeido ? theme.typography.fontBodySemibold : theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme, $noLeido }) =>
    $noLeido ? theme.colors.textPrimary : theme.colors.textSecondary};
`;

const Contador = styled(Animated.View)`
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  border-radius: 12px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoContador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.onPrimary};
`;

export default ItemConversacion;
