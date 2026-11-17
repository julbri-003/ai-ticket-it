import styled, { useTheme } from "styled-components/native";
import { CalendarDays, Heart, MapPin } from "lucide-react-native";
import {
  Badge,
  EventoCanceladoBadge,
  ImagenEvento,
  Rating,
  Sello,
  TextoTalon,
  TicketCard,
} from "../ui";
import { useFoco } from "../ui/foco";
import { ChipFecha } from "./ChipFecha";

/** Corazón de favorito (toggle accesible). */
export function BotonFavorito({ activo, onPress, nombre }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  return (
    <Corazon
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        activo ? `Quitar ${nombre} de favoritos` : `Guardar ${nombre} en favoritos`
      }
      accessibilityState={{ checked: activo }}
      $enfocado={enfocado}
      testID="boton-favorito"
      {...propsFoco}
    >
      <Heart
        size={22}
        color={activo ? theme.colors.accentText : theme.colors.textSecondary}
        fill={activo ? theme.colors.accentText : "transparent"}
        accessible={false}
      />
    </Corazon>
  );
}

/**
 * Tarjeta de evento: imagen, nombre, categoría, fecha, lugar, "desde $X", estrellas del
 * organizador y corazón. Los eventos anteriores se ven en gris, con badge "Finalizado".
 * Chip de talón con la fecha sobre la imagen, badge "Últimas entradas" (≤ 10 % del cupo) y, con
 * `sello`, un sello decorativo (por ejemplo "Para vos" en el carrusel de recomendados).
 */
export function TarjetaEvento({
  evento,
  onPress,
  esFavorito,
  onFavorito,
  accionesAccesibles,
  onAccionAccesible,
  sello,
}) {
  const theme = useTheme();
  const anterior = evento.anterior;
  const cerrado = anterior || evento.cancelado;
  const estadoTexto = evento.cancelado ? "Cancelado" : anterior ? "Finalizado" : null;
  const ultimas = Boolean(evento.quedanPocas) && !cerrado && !evento.agotado;
  return (
    <Contenedor $anterior={cerrado}>
      <TicketCard
        onPress={onPress}
        testID={`tarjeta-evento-${evento.id}`}
        accessibilityActions={accionesAccesibles}
        onAccessibilityAction={onAccionAccesible}
        accessibilityLabel={`${evento.nombre}. ${evento.categoria.nombre}. ${evento.fechaTexto}, ${evento.lugar}. ${
          estadoTexto ?? evento.desdeTexto
        }${ultimas ? ". Últimas entradas" : ""}`}
        talon={
          <FilaTalon>
            <TextoTalon>
              {estadoTexto ?? (evento.agotado ? "Agotado" : evento.desdeTexto)}
            </TextoTalon>
            {!cerrado && !evento.agotado ? <TextoTalon>Comprar ›</TextoTalon> : null}
          </FilaTalon>
        }
      >
        <ConImagen>
          <ImagenEvento
            uri={evento.imagen?.uri}
            alt={evento.imagen?.alt ?? `Imagen de ${evento.nombre}`}
          />
          <ChipFecha dia={evento.dia} mes={evento.mes} testID={`chip-fecha-${evento.id}`} />
          {sello ? <Sello testID={`sello-${evento.id}`}>{sello}</Sello> : null}
        </ConImagen>
        <FilaSuperior>
          <Badges>
            {evento.cancelado ? (
              <EventoCanceladoBadge />
            ) : (
              <Badge variant={anterior ? "neutral" : "primary"}>
                {anterior ? "Finalizado" : evento.categoria.nombre}
              </Badge>
            )}
            {ultimas ? <Badge variant="warning">Últimas entradas</Badge> : null}
          </Badges>
          {onFavorito ? (
            <BotonFavorito activo={esFavorito} onPress={onFavorito} nombre={evento.nombre} />
          ) : null}
        </FilaSuperior>
        <Nombre numberOfLines={2}>{evento.nombre}</Nombre>
        <Fila>
          <CalendarDays size={16} color={theme.colors.textSecondary} accessible={false} />
          <Secundario>{evento.fechaTexto}</Secundario>
        </Fila>
        <Fila>
          <MapPin size={16} color={theme.colors.textSecondary} accessible={false} />
          <Secundario numberOfLines={1}>{evento.lugar}</Secundario>
        </Fila>
        <Fila>
          <Rating
            valor={evento.organizador.puntaje}
            tamanio={14}
            cantidad={evento.organizador.cantidadResenias}
          />
          <Secundario numberOfLines={1}>{evento.organizador.nombre}</Secundario>
        </Fila>
      </TicketCard>
    </Contenedor>
  );
}

const Contenedor = styled.View`
  opacity: ${({ $anterior }) => ($anterior ? 0.62 : 1)};
`;

const ConImagen = styled.View``;

const Badges = styled.View`
  flex: 1;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
`;

const FilaSuperior = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Corazon = styled.Pressable`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 0)}px;
  border-color: ${({ theme }) => theme.colors.focusRing};
`;

const Nombre = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Secundario = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

export default TarjetaEvento;
