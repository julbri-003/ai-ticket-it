import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { Button, Modal, Rating, Textarea } from "../ui";
import { useToast } from "../../context/ToastContext";
import { comprasService } from "../../service/comprasService";

const MAX_DETALLE = 1000;

/** Calificar una compra UTILIZADA: estrellas de 0,5 a 5 + comentario opcional (máx. 1000). */
export function ModalCalificar({ visible, compra, alCerrar, alCalificar }) {
  const toast = useToast();
  const [puntuacion, setPuntuacion] = useState(0);
  const [detalle, setDetalle] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setPuntuacion(0);
      setDetalle("");
      setError(null);
    }
  }, [visible]);

  const enviar = async () => {
    if (puntuacion < 1) {
      setError("Elegí al menos una estrella.");
      return;
    }
    setEnviando(true);
    try {
      await comprasService.reseniar(compra.id, { puntuacion, detalle });
      toast.success("¡Gracias! Tu reseña ya está publicada.", "Reseña enviada");
      alCalificar?.();
      alCerrar();
    } catch (e) {
      toast.error(e.message, "No pudimos enviar tu reseña");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      alCerrar={enviando ? undefined : alCerrar}
      titulo="¿Qué te pareció?"
      subtitulo={compra ? `${compra.evento.nombre} · ${compra.tipoEntrada}` : undefined}
      testID="modal-calificar"
      pie={
        <>
          <Button variant="outline" onPress={alCerrar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onPress={enviar} loading={enviando} testID="enviar-resenia">
            Enviar reseña
          </Button>
        </>
      }
    >
      <Centro>
        <Rating
          valor={puntuacion}
          onCambiar={(v) => {
            setPuntuacion(v);
            setError(null);
          }}
          tamanio={34}
        />
        <Valor>
          {puntuacion ? `${String(puntuacion).replace(".", ",")} de 5` : "Tocá las estrellas"}
        </Valor>
        {error ? (
          <TextoError accessibilityRole="alert" accessibilityLiveRegion="polite">
            {error}
          </TextoError>
        ) : null}
      </Centro>
      <Textarea
        label="Comentario (opcional)"
        value={detalle}
        onChangeText={setDetalle}
        maxLength={MAX_DETALLE}
        placeholder="Contá cómo fue tu experiencia"
      />
    </Modal>
  );
}

const Centro = styled.View`
  align-items: center;
  gap: 8px;
`;

const Valor = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const TextoError = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  color: ${({ theme }) => theme.colors.error};
`;

export default ModalCalificar;
