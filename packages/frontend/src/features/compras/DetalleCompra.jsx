import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { CreditCard, MessageCircle, RotateCcw, Star, XCircle } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { ModalCalificar } from "../../components/compras/ModalCalificar";
import { TimelineEstados } from "../../components/compras/TimelineEstados";
import {
  Button,
  Card,
  ErrorState,
  EstadoCompraBadge,
  EtiquetaSeccion,
  ImagenEvento,
  ModalConfirmacion,
  Rating,
  SkeletonDetalle,
  TextoTalon,
  TicketCard,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { comprasService } from "../../service/comprasService";

/** Texto del modal de cancelación según el estado de la compra. */
export function mensajeCancelacion(compra) {
  return compra.estado === "CONFIRMADA"
    ? `Se te reembolsarán ${compra.totalTexto} dentro de 24 h.`
    : "Se liberarán tus entradas y la reserva quedará cancelada.";
}

/**
 * Detalle de compra: estado y días restantes, datos, timeline del historial y las acciones que
 * habilitan los flags del back (pagar, cancelar, calificar) más el chat con el organizador.
 */
export function DetalleCompra({ route, navigation }) {
  const { compraId } = route.params;
  const { usuario } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState({ cargando: true });
  const [cancelando, setCancelando] = useState(false);
  const [confirmarCancelacion, setConfirmarCancelacion] = useState(false);
  const [calificando, setCalificando] = useState(false);
  const [confirmarReembolso, setConfirmarReembolso] = useState(false);
  const [reembolsando, setReembolsando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({ cargando: false, compra: await comprasService.detalle(compraId, usuario.id) });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [compraId, usuario.id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const { compra } = estado;

  if (estado.cargando && !compra) {
    return (
      <Pantalla>
        <SkeletonDetalle />
      </Pantalla>
    );
  }
  if (estado.error && !compra) {
    return (
      <Pantalla>
        <ErrorState
          titulo="No pudimos cargar la compra"
          mensaje={estado.error.message}
          alReintentar={cargar}
        />
      </Pantalla>
    );
  }

  const cancelar = async () => {
    setCancelando(true);
    try {
      const actualizada = await comprasService.cancelar(compra.id, usuario.id);
      setEstado({ cargando: false, compra: actualizada });
      toast.success(
        actualizada.reembolsoPendiente
          ? "Cancelaste la compra. El reembolso está en proceso."
          : "Cancelaste la reserva.",
        "Compra cancelada",
      );
    } catch (error) {
      toast.error(error.message, "No pudimos cancelar la compra");
      cargar();
    } finally {
      setCancelando(false);
      setConfirmarCancelacion(false);
    }
  };

  const reembolsar = async () => {
    setReembolsando(true);
    try {
      setEstado({
        cargando: false,
        compra: await comprasService.reembolsar(compra.id, usuario.id),
      });
      toast.success(`Reembolsaste ${compra.totalTexto}.`, "Reembolso registrado");
    } catch (error) {
      toast.error(error.message, "No pudimos registrar el reembolso");
      cargar();
    } finally {
      setReembolsando(false);
      setConfirmarReembolso(false);
    }
  };

  const { acciones, esOrganizador } = compra;

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando}>
      <TicketCard
        talon={
          <FilaTalon>
            <TextoTalon>
              {compra.cantidad} × {compra.tipoEntrada}
            </TextoTalon>
            <TextoTalon>{compra.totalTexto}</TextoTalon>
          </FilaTalon>
        }
      >
        <Cabecera>
          <EstadoCompraBadge estado={compra.estado} />
          {compra.diasTexto ? <Dias testID="detalle-dias">{compra.diasTexto}</Dias> : null}
        </Cabecera>
        <ImagenEvento
          uri={compra.evento.imagen?.uri}
          alt={compra.evento.imagen?.alt ?? compra.evento.nombre}
        />
        <Nombre>{compra.evento.nombre}</Nombre>
        <Secundario>
          {compra.evento.fechaTexto} · {compra.evento.lugar}
        </Secundario>
        <Fila>
          <Etiqueta>Precio unitario</Etiqueta>
          <Valor>{compra.precioUnitarioTexto}</Valor>
        </Fila>
        <Fila>
          <Etiqueta>Comprada el</Etiqueta>
          <Valor>{compra.fechaCompraTexto}</Valor>
        </Fila>
        {compra.fechaLimitePagoTexto ? (
          <Fila>
            <Etiqueta>Pagá antes del</Etiqueta>
            <Valor>{compra.fechaLimitePagoTexto}</Valor>
          </Fila>
        ) : null}
        {compra.reembolsoPendiente ? (
          <Fila>
            <Etiqueta>Reembolso en proceso hasta</Etiqueta>
            <Valor>{compra.fechaLimiteReembolsoTexto}</Valor>
          </Fila>
        ) : null}
      </TicketCard>

      <Acciones>
        {acciones.puedePagar ? (
          <Button
            icono={CreditCard}
            onPress={() => navigation.navigate("Checkout", { compraId: compra.id })}
            bloque
            testID="accion-pagar"
          >
            {`Pagar ${compra.totalTexto}`}
          </Button>
        ) : null}
        {acciones.puedeReseniar ? (
          <Button
            variant="secondary"
            icono={Star}
            onPress={() => setCalificando(true)}
            bloque
            testID="accion-calificar"
          >
            Calificar
          </Button>
        ) : null}
        {acciones.puedeReembolsar ? (
          <Button
            icono={RotateCcw}
            onPress={() => setConfirmarReembolso(true)}
            bloque
            testID="accion-reembolsar"
          >
            {`Reembolsar ${compra.totalTexto}`}
          </Button>
        ) : null}
        <Button
          variant="outline"
          icono={MessageCircle}
          onPress={() => navigation.navigate("ChatCompra", { compraId: compra.id })}
          bloque
          testID="accion-chat"
        >
          {esOrganizador ? "Chat con el comprador" : "Chat con el organizador"}
        </Button>
        {acciones.puedeCancelar ? (
          <Button
            variant="ghost"
            icono={XCircle}
            onPress={() => setConfirmarCancelacion(true)}
            bloque
            testID="accion-cancelar"
          >
            Cancelar compra
          </Button>
        ) : null}
      </Acciones>

      {compra.resenia ? (
        <Card>
          <EtiquetaSeccion>{esOrganizador ? "Reseña del comprador" : "Tu reseña"}</EtiquetaSeccion>
          <Rating valor={compra.resenia.puntuacion} />
          {compra.resenia.detalle ? <Secundario>“{compra.resenia.detalle}”</Secundario> : null}
        </Card>
      ) : null}

      <Seccion>
        <EtiquetaSeccion>Historial</EtiquetaSeccion>
        <TimelineEstados historial={compra.historial} />
      </Seccion>

      <ModalConfirmacion
        visible={confirmarCancelacion}
        titulo="¿Cancelar la compra?"
        mensaje={mensajeCancelacion(compra)}
        textoConfirmar="Sí, cancelar"
        textoCancelar="Volver"
        peligro
        cargando={cancelando}
        alConfirmar={cancelar}
        alCancelar={() => setConfirmarCancelacion(false)}
      />
      <ModalConfirmacion
        visible={confirmarReembolso}
        titulo="¿Registrar el reembolso?"
        mensaje={`Confirmás que le devolviste ${compra.totalTexto} al comprador. La compra pasa a Reembolsada.`}
        textoConfirmar="Reembolsar"
        textoCancelar="Volver"
        cargando={reembolsando}
        alConfirmar={reembolsar}
        alCancelar={() => setConfirmarReembolso(false)}
      />
      <ModalCalificar
        visible={calificando}
        compra={compra}
        alCerrar={() => setCalificando(false)}
        alCalificar={cargar}
      />
    </Pantalla>
  );
}

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Dias = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Nombre = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Secundario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Fila = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.divider};
`;

const Etiqueta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Valor = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Acciones = styled.View`
  gap: 10px;
`;

const Seccion = styled.View`
  gap: 12px;
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

export default DetalleCompra;
