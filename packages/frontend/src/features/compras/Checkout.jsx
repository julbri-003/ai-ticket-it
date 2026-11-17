import { useCallback, useEffect, useState } from "react";
import styled, { useTheme } from "styled-components/native";
import { Clock, CreditCard } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Button,
  ErrorState,
  EstadoCompraBadge,
  EtiquetaSeccion,
  ModalConfirmacion,
  SkeletonDetalle,
  TextoTalon,
  TicketCard,
  TituloEscena,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { comprasService } from "../../service/comprasService";
import { tiempoRestanteTexto } from "../../utils/fechas";

/** Cuenta regresiva que se actualiza cada segundo. */
function useCuentaRegresiva(hastaIso) {
  const [texto, setTexto] = useState(() => (hastaIso ? tiempoRestanteTexto(hastaIso) : null));
  useEffect(() => {
    if (!hastaIso) return undefined;
    setTexto(tiempoRestanteTexto(hastaIso));
    const id = setInterval(() => setTexto(tiempoRestanteTexto(hastaIso)), 1000);
    return () => clearInterval(id);
  }, [hastaIso]);
  return texto;
}

/** Checkout: resumen, cuenta regresiva hasta la fecha límite y pago simulado con confirmación. */
export function Checkout({ route, navigation }) {
  const theme = useTheme();
  const { compraId } = route.params;
  const { usuario } = useAuth();
  const toast = useToast();
  const [estado, setEstado] = useState({ cargando: true });
  const [confirmando, setConfirmando] = useState(false);
  const [pagando, setPagando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({ cargando: false, compra: await comprasService.detalle(compraId, usuario.id) });
    } catch (error) {
      setEstado({ cargando: false, error });
    }
  }, [compraId, usuario.id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const { compra } = estado;
  const restante = useCuentaRegresiva(compra?.acciones.puedePagar ? compra.fechaLimitePago : null);

  if (estado.cargando && !compra) {
    return (
      <Pantalla>
        <SkeletonDetalle />
      </Pantalla>
    );
  }
  if (estado.error) {
    return (
      <Pantalla>
        <ErrorState
          titulo="No pudimos cargar tu compra"
          mensaje={estado.error.message}
          alReintentar={cargar}
        />
      </Pantalla>
    );
  }

  const pagar = async () => {
    setPagando(true);
    try {
      await comprasService.pagar(compra.id, usuario.id);
      setConfirmando(false);
      toast.success(
        `Pagaste ${compra.totalTexto}. ¡Tus entradas están confirmadas!`,
        "Pago confirmado",
      );
      navigation.replace("DetalleCompra", { compraId: compra.id });
    } catch (error) {
      setConfirmando(false);
      toast.error(error.message, "No pudimos procesar el pago");
      cargar();
    } finally {
      setPagando(false);
    }
  };

  const irAMisCompras = () => navigation.navigate("TabsComprador", { screen: "MisCompras" });

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando}>
      <EtiquetaSeccion>Checkout</EtiquetaSeccion>
      <TituloEscena texto="Confirmá tu compra" destacada="compra" />

      <TicketCard
        talon={
          <FilaTalon>
            <TextoTalon>Total a pagar</TextoTalon>
            <TextoTalon testID="checkout-total">{compra.totalTexto}</TextoTalon>
          </FilaTalon>
        }
      >
        <EstadoCompraBadge estado={compra.estado} />
        <Nombre>{compra.evento.nombre}</Nombre>
        <Secundario>
          {compra.evento.fechaTexto} · {compra.evento.lugar}
        </Secundario>
        <Fila>
          <Etiqueta>Tipo de entrada</Etiqueta>
          <Valor>{compra.tipoEntrada}</Valor>
        </Fila>
        <Fila>
          <Etiqueta>Cantidad</Etiqueta>
          <Valor>{compra.cantidad}</Valor>
        </Fila>
        <Fila>
          <Etiqueta>Precio unitario</Etiqueta>
          <Valor>{compra.precioUnitarioTexto}</Valor>
        </Fila>
      </TicketCard>

      {compra.acciones.puedePagar ? (
        <>
          <Limite accessibilityLiveRegion="polite">
            <Clock size={18} color={theme.colors.warning} accessible={false} />
            <TextosLimite>
              <TextoLimite>Tenés hasta el {compra.fechaLimitePagoTexto} para pagar</TextoLimite>
              <Restante testID="cuenta-regresiva">Vence en {restante}</Restante>
            </TextosLimite>
          </Limite>
          <Button
            icono={CreditCard}
            onPress={() => setConfirmando(true)}
            bloque
            testID="boton-pagar"
          >
            {`Pagar ${compra.totalTexto}`}
          </Button>
          <Button variant="ghost" onPress={irAMisCompras} bloque>
            Pagar más tarde
          </Button>
        </>
      ) : (
        <>
          <Secundario>
            {compra.vencida
              ? "Esta reserva venció y las entradas se liberaron."
              : "Esta compra ya no está pendiente de pago."}
          </Secundario>
          <Button
            variant="outline"
            onPress={() => navigation.replace("DetalleCompra", { compraId: compra.id })}
            bloque
          >
            Ver detalle de la compra
          </Button>
        </>
      )}

      <ModalConfirmacion
        visible={confirmando}
        titulo="Confirmar pago"
        mensaje={`¿Seguro que querés pagar ${compra.totalTexto}?`}
        textoConfirmar="Pagar"
        cargando={pagando}
        alConfirmar={pagar}
        alCancelar={() => setConfirmando(false)}
      />
    </Pantalla>
  );
}

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

const Limite = styled.View`
  flex-direction: row;
  gap: 10px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.estados.PENDIENTE.fondo};
`;

const TextosLimite = styled.View`
  flex: 1;
  gap: 2px;
`;

const TextoLimite = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.estados.PENDIENTE.texto};
`;

const Restante = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.estados.PENDIENTE.texto};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

export default Checkout;
