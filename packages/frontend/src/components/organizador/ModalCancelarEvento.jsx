import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { Button, Modal, Textarea } from "../ui";
import { useToast } from "../../context/ToastContext";
import { organizadorService } from "../../service/organizadorService";

export const MAX_MOTIVO = 500;

/**
 * Cancelar un evento con motivo obligatorio. Avisa que todas las compras se cancelan y las
 * pagas se reembolsan automáticamente, y que no se puede deshacer.
 */
export function ModalCancelarEvento({ visible, evento, alCerrar, alCancelar }) {
  const toast = useToast();
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState(null);
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    if (visible) {
      setMotivo("");
      setError(null);
    }
  }, [visible]);

  const confirmar = async () => {
    if (!motivo.trim()) {
      setError("Contá el motivo: lo van a ver los compradores.");
      return;
    }
    setCancelando(true);
    try {
      const { comprasResueltas } = await organizadorService.cancelarEvento(evento.id, motivo);
      toast.success(
        comprasResueltas > 0
          ? `Cancelaste "${evento.nombre}". Se cancelaron y reembolsaron ${comprasResueltas} ${
              comprasResueltas === 1 ? "compra" : "compras"
            }.`
          : `Cancelaste "${evento.nombre}".`,
        "Evento cancelado",
      );
      alCancelar?.();
      alCerrar();
    } catch (e) {
      toast.error(e.message, "No pudimos cancelar el evento");
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      alCerrar={cancelando ? undefined : alCerrar}
      titulo="¿Cancelar el evento?"
      subtitulo="No se puede deshacer."
      testID="modal-cancelar-evento"
      pie={
        <>
          <Button variant="outline" onPress={alCerrar} disabled={cancelando}>
            Volver
          </Button>
          <Button
            variant="danger"
            onPress={confirmar}
            loading={cancelando}
            testID="confirmar-cancelar-evento"
          >
            Cancelar evento
          </Button>
        </>
      }
    >
      <Aviso>
        Todas las compras se cancelan: las pagas se reembolsan automáticamente y las pendientes
        quedan sin cargo. El evento deja de estar a la venta.
      </Aviso>
      <Textarea
        label="Motivo de la cancelación"
        requerido
        value={motivo}
        onChangeText={(v) => {
          setMotivo(v);
          setError(null);
        }}
        error={error}
        maxLength={MAX_MOTIVO}
        ayuda="Los compradores lo reciben en la notificación."
        testID="motivo-cancelacion-input"
      />
    </Modal>
  );
}

const Aviso = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default ModalCancelarEvento;
