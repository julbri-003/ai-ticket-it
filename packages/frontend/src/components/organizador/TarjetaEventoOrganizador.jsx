import styled, { useTheme } from "styled-components/native";
import { AlertTriangle, CalendarDays } from "lucide-react-native";
import { Badge, EventoCanceladoBadge, ImagenEvento, TextoTalon, TicketCard } from "../ui";
import { ETIQUETAS_ESTADO } from "../../utils/estadosCompra";
import { BarraOcupacion } from "./BarraOcupacion";

const ORDEN_ESTADOS = ["PENDIENTE", "CONFIRMADA", "UTILIZADA", "CANCELADA", "REEMBOLSADA"];

/**
 * Evento en "Mis eventos": imagen, nombre, fecha, ocupación total, conteo por estado y alerta
 * de reembolsos pendientes. Los anteriores se ven en gris.
 */
export function TarjetaEventoOrganizador({ evento, onPress, onEditar }) {
  const theme = useTheme();
  const conteos = ORDEN_ESTADOS.filter((e) => evento.porEstado[e] > 0);
  const cerrado = evento.anterior || evento.cancelado;
  return (
    <Contenedor $anterior={cerrado}>
      <TicketCard
        onPress={onPress}
        testID={`evento-org-${evento.id}`}
        accessibilityLabel={`${evento.cancelado ? "Cancelado. " : ""}${evento.nombre}, ${evento.fechaTexto}. ${evento.vendidasTotal} de ${evento.cupoTotal} vendidas.${
          evento.reembolsos.texto ? ` ${evento.reembolsos.texto}.` : ""
        }`}
        talon={
          <FilaTalon>
            <TextoTalon>
              {evento.cancelado
                ? "Cancelado · Ver compras ›"
                : evento.anterior
                  ? "Finalizado"
                  : "Ver compras ›"}
            </TextoTalon>
            {!cerrado && onEditar ? (
              <Editar
                onPress={onEditar}
                accessibilityRole="button"
                accessibilityLabel={`Editar ${evento.nombre}`}
              >
                <TextoTalon>Editar</TextoTalon>
              </Editar>
            ) : null}
          </FilaTalon>
        }
      >
        {evento.reembolsos.texto ? (
          <Alerta accessibilityRole="alert" testID="alerta-reembolsos">
            <AlertTriangle
              size={16}
              color={theme.colors.estados.CANCELADA.texto}
              accessible={false}
            />
            <TextoAlerta>{evento.reembolsos.texto}</TextoAlerta>
          </Alerta>
        ) : null}
        <Fila>
          <Miniatura>
            <ImagenEvento
              uri={evento.imagen?.uri}
              alt={evento.imagen?.alt ?? evento.nombre}
              relacion={1}
            />
          </Miniatura>
          <Datos>
            {evento.cancelado ? (
              <EventoCanceladoBadge />
            ) : (
              <Badge variant={evento.anterior ? "neutral" : "primary"}>
                {evento.anterior ? "Finalizado" : evento.categoria.nombre}
              </Badge>
            )}
            <Nombre numberOfLines={2}>{evento.nombre}</Nombre>
            <FilaIcono>
              <CalendarDays size={14} color={theme.colors.textSecondary} accessible={false} />
              <Secundario>{evento.fechaTexto}</Secundario>
            </FilaIcono>
          </Datos>
        </Fila>
        {evento.cancelado && evento.motivoCancelacion ? (
          <Secundario testID="motivo-cancelacion">Motivo: {evento.motivoCancelacion}</Secundario>
        ) : null}
        <BarraOcupacion vendidas={evento.vendidasTotal} cupo={evento.cupoTotal} />
        {conteos.length > 0 ? (
          <Conteos>
            {conteos.map((estado) => (
              <Conteo key={estado}>
                {ETIQUETAS_ESTADO[estado]}: {evento.porEstado[estado]}
              </Conteo>
            ))}
          </Conteos>
        ) : (
          <Secundario>Todavía no hay compras.</Secundario>
        )}
      </TicketCard>
    </Contenedor>
  );
}

const Contenedor = styled.View`
  opacity: ${({ $anterior }) => ($anterior ? 0.62 : 1)};
`;

const Alerta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.estados.CANCELADA.fondo};
`;

const TextoAlerta = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.estados.CANCELADA.texto};
`;

const Fila = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const Miniatura = styled.View`
  width: 76px;
`;

const Datos = styled.View`
  flex: 1;
  gap: 4px;
`;

const Nombre = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FilaIcono = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const Secundario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Conteos = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px 12px;
`;

const Conteo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const Editar = styled.Pressable`
  min-height: 32px;
  justify-content: center;
`;

export default TarjetaEventoOrganizador;
