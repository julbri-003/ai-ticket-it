import { useEffect, useRef } from "react";
import { AccessibilityInfo, Modal as ModalNativo, findNodeHandle } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { X } from "lucide-react-native";
import { Button } from "./Button";

/** Devuelve el foco al elemento que abrió el modal (lector de pantalla y teclado). */
function devolverFoco(ref) {
  const nodo = ref?.current;
  if (!nodo) return;
  nodo.focus?.();
  const handle = findNodeHandle?.(nodo);
  if (handle) AccessibilityInfo.setAccessibilityFocus?.(handle);
}

/**
 * Modal accesible (misma API que REPO_REF: visible/isOpen, alCerrar/onClose, titulo, subtitulo,
 * pie). Atrapa el foco (accessibilityViewIsModal), se cierra con back/Escape (onRequestClose) y,
 * al cerrarse, devuelve el foco a `refDisparador`.
 */
export function Modal({
  visible,
  isOpen,
  alCerrar,
  onClose,
  titulo,
  title,
  subtitulo,
  children,
  pie,
  refDisparador,
  cerrable = true,
  testID,
}) {
  const theme = useTheme();
  const abierto = visible ?? isOpen ?? false;
  const cerrar = alCerrar ?? onClose;
  const estabaAbierto = useRef(abierto);

  useEffect(() => {
    if (estabaAbierto.current && !abierto) devolverFoco(refDisparador);
    estabaAbierto.current = abierto;
  }, [abierto, refDisparador]);

  return (
    <ModalNativo
      visible={abierto}
      transparent
      animationType="fade"
      onRequestClose={() => cerrable && cerrar?.()}
      statusBarTranslucent
    >
      <Fondo>
        <Caja accessibilityViewIsModal accessibilityRole="none" aria-modal testID={testID}>
          <Cabecera>
            <TextosCabecera>
              <Titulo accessibilityRole="header">{titulo ?? title}</Titulo>
              {subtitulo ? <Subtitulo>{subtitulo}</Subtitulo> : null}
            </TextosCabecera>
            {cerrable ? (
              <BotonCerrar onPress={cerrar} accessibilityRole="button" accessibilityLabel="Cerrar">
                <X size={20} color={theme.colors.textSecondary} accessible={false} />
              </BotonCerrar>
            ) : null}
          </Cabecera>
          {children ? <Cuerpo>{children}</Cuerpo> : null}
          {pie ? <Pie>{pie}</Pie> : null}
        </Caja>
      </Fondo>
    </ModalNativo>
  );
}

/**
 * Confirmación de acciones destructivas o de pago: título, texto, confirmar/cancelar y loading.
 */
export function ModalConfirmacion({
  visible,
  titulo,
  mensaje,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  alConfirmar,
  alCancelar,
  cargando = false,
  peligro = false,
  refDisparador,
}) {
  return (
    <Modal
      visible={visible}
      alCerrar={cargando ? undefined : alCancelar}
      cerrable={!cargando}
      titulo={titulo}
      refDisparador={refDisparador}
      testID="modal-confirmacion"
      pie={
        <>
          <Button variant="outline" onPress={alCancelar} disabled={cargando}>
            {textoCancelar}
          </Button>
          <Button variant={peligro ? "danger" : "primary"} onPress={alConfirmar} loading={cargando}>
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <Mensaje>{mensaje}</Mensaje>
    </Modal>
  );
}

const Fondo = styled.View`
  flex: 1;
  justify-content: center;
  padding: 20px;
  background-color: ${({ theme }) => theme.colors.overlay};
`;

const Caja = styled.View`
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
  padding: 20px;
  gap: 16px;
  max-height: 90%;
`;

const Cabecera = styled.View`
  flex-direction: row;
  align-items: flex-start;
  gap: 8px;
`;

const TextosCabecera = styled.View`
  flex: 1;
  gap: 4px;
`;

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Subtitulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BotonCerrar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const Cuerpo = styled.View`
  gap: 12px;
`;

const Pie = styled.View`
  flex-direction: row;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
`;

const Mensaje = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default Modal;
