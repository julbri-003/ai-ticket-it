import styled, { useTheme } from "styled-components/native";
import {
  CalendarDays,
  CreditCard,
  Hourglass,
  MessageCircle,
  RotateCcw,
  Star,
  Ban,
} from "lucide-react-native";
import { Button, EstadoCompraBadge, ImagenEvento, TextoTalon, TicketCard } from "../ui";

/** Aviso destacado arriba de la tarjeta según el estado. */
function Aviso({ compra }) {
  const theme = useTheme();
  if (compra.estado === "CONFIRMADA" && compra.diasTexto) {
    return (
      <FilaAviso $fondo={theme.colors.estados.CONFIRMADA.fondo} testID="aviso-dias">
        <Hourglass size={16} color={theme.colors.estados.CONFIRMADA.texto} accessible={false} />
        <TextoAviso $color={theme.colors.estados.CONFIRMADA.texto}>{compra.diasTexto}</TextoAviso>
      </FilaAviso>
    );
  }
  if (compra.estado === "PENDIENTE" && compra.fechaLimitePagoTexto) {
    return (
      <FilaAviso $fondo={theme.colors.estados.PENDIENTE.fondo}>
        <Hourglass size={16} color={theme.colors.estados.PENDIENTE.texto} accessible={false} />
        <TextoAviso $color={theme.colors.estados.PENDIENTE.texto}>
          Pagá antes del {compra.fechaLimitePagoTexto}
        </TextoAviso>
      </FilaAviso>
    );
  }
  if (compra.eventoCancelado) {
    return (
      <FilaAviso $fondo={theme.colors.estados.CANCELADA.fondo} testID="aviso-evento-cancelado">
        <Ban size={16} color={theme.colors.estados.CANCELADA.texto} accessible={false} />
        <TextoAviso $color={theme.colors.estados.CANCELADA.texto}>
          {compra.estado === "REEMBOLSADA"
            ? "Evento cancelado: te reembolsamos automáticamente"
            : "Evento cancelado por el organizador"}
        </TextoAviso>
      </FilaAviso>
    );
  }
  if (compra.estado === "CANCELADA" && compra.reembolsoPendiente) {
    return (
      <FilaAviso $fondo={theme.colors.estados.REEMBOLSADA.fondo}>
        <RotateCcw size={16} color={theme.colors.estados.REEMBOLSADA.texto} accessible={false} />
        <TextoAviso $color={theme.colors.estados.REEMBOLSADA.texto}>
          Reembolso en proceso (hasta el {compra.fechaLimiteReembolsoTexto})
        </TextoAviso>
      </FilaAviso>
    );
  }
  return null;
}

/**
 * Compra en "Mis compras": evento, fecha, tipo × cantidad, total, estado bien visible y el dato
 * o la acción que corresponde (días que faltan, pagar, reembolso en proceso, calificar).
 */
export function TarjetaCompra({ compra, onPress, onPagar, onCalificar }) {
  const theme = useTheme();
  return (
    <TicketCard
      onPress={onPress}
      testID={`tarjeta-compra-${compra.id}`}
      accessibilityLabel={`${compra.evento.nombre}. ${compra.estadoTexto}. ${compra.cantidad} × ${compra.tipoEntrada}, ${compra.totalTexto}`}
      talon={
        <FilaTalon>
          <TextoTalon>
            {compra.cantidad} × {compra.tipoEntrada}
          </TextoTalon>
          <TextoTalon>{compra.totalTexto}</TextoTalon>
        </FilaTalon>
      }
    >
      <Aviso compra={compra} />
      <FilaSuperior>
        <EstadoCompraBadge estado={compra.estado} />
        {compra.mensajesNoLeidos > 0 ? (
          <Mensajes accessibilityLabel={`${compra.mensajesNoLeidos} mensajes sin leer`} accessible>
            <MessageCircle size={16} color={theme.colors.onPrimary} accessible={false} />
            <TextoMensajes>{compra.mensajesNoLeidos}</TextoMensajes>
          </Mensajes>
        ) : null}
      </FilaSuperior>
      <Fila>
        <Miniatura>
          <ImagenEvento
            uri={compra.evento.imagen?.uri}
            alt={compra.evento.imagen?.alt ?? compra.evento.nombre}
            relacion={1}
          />
        </Miniatura>
        <Datos>
          <Nombre numberOfLines={2}>{compra.evento.nombre}</Nombre>
          <FilaIcono>
            <CalendarDays size={14} color={theme.colors.textSecondary} accessible={false} />
            <Secundario>{compra.evento.fechaTexto}</Secundario>
          </FilaIcono>
          <Secundario numberOfLines={1}>{compra.evento.lugar}</Secundario>
        </Datos>
      </Fila>
      {compra.acciones.puedePagar && onPagar ? (
        <Button icono={CreditCard} onPress={onPagar} bloque>
          {`Pagar ${compra.totalTexto}`}
        </Button>
      ) : null}
      {compra.acciones.puedeReseniar && onCalificar ? (
        <Button variant="secondary" icono={Star} onPress={onCalificar} bloque>
          Calificar
        </Button>
      ) : null}
    </TicketCard>
  );
}

const FilaAviso = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ $fondo }) => $fondo};
`;

const TextoAviso = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ $color }) => $color};
`;

const FilaSuperior = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Mensajes = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoMensajes = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.onPrimary};
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

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

export default TarjetaCompra;
