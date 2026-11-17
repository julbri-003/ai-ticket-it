import styled from "styled-components/native";
import { Card, EstadoCompraBadge, ImagenEvento } from "../ui";

/** Fila de la bandeja: imagen del evento, con quién, último mensaje, hora, no leídos y estado. */
export function ItemConversacion({ conversacion: c, onPress }) {
  const ultimo = `${c.ultimoMensaje.propio ? "Vos: " : ""}${c.ultimoMensaje.texto}`;
  const etiqueta = `${c.evento.nombre}, con ${c.otro.nombre} (${c.otro.rolTexto}). ${
    c.noLeidos > 0 ? `${c.noLeidos} sin leer. ` : ""
  }Último mensaje ${c.cuandoTexto}: ${ultimo}. Compra ${c.estadoTexto}`;
  return (
    <Card onPress={onPress} accessibilityLabel={etiqueta} testID={`conversacion-${c.compraId}`}>
      <Fila>
        <Miniatura>
          <ImagenEvento
            uri={c.evento.imagen?.uri}
            alt={c.evento.imagen?.alt ?? c.evento.nombre}
            relacion={1}
          />
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
              <Contador testID={`no-leidos-${c.compraId}`}>
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

const Contador = styled.View`
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
