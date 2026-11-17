import { useEffect, useState } from "react";
import { Button, Modal } from "../ui";
import { useToast } from "../../context/ToastContext";
import { organizadorService, validarTipoEntrada } from "../../service/organizadorService";
import { CamposTipoEntrada, tipoVacio } from "./EditorTiposEntrada";

/** Agregar un tipo de entrada a un evento publicado (los existentes nunca se modifican). */
export function ModalTipoEntrada({ visible, eventoId, nombresExistentes, alCerrar, alAgregar }) {
  const toast = useToast();
  const [tipo, setTipo] = useState(tipoVacio());
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (visible) {
      setTipo(tipoVacio());
      setErrores({});
    }
  }, [visible]);

  const guardar = async () => {
    const encontrados = validarTipoEntrada(tipo, nombresExistentes);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setGuardando(true);
    try {
      const evento = await organizadorService.agregarTipoEntrada(eventoId, tipo);
      toast.success(`Agregaste el tipo "${tipo.nombre.trim()}".`, "Tipo de entrada agregado");
      alAgregar?.(evento);
      alCerrar();
    } catch (error) {
      toast.error(error.message, "No pudimos agregar el tipo de entrada");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      visible={visible}
      alCerrar={guardando ? undefined : alCerrar}
      titulo="Nuevo tipo de entrada"
      subtitulo="Una vez creado no se puede modificar ni borrar."
      testID="modal-tipo-entrada"
      pie={
        <>
          <Button variant="outline" onPress={alCerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button onPress={guardar} loading={guardando} testID="guardar-tipo">
            Agregar
          </Button>
        </>
      }
    >
      <CamposTipoEntrada tipo={tipo} errores={errores} onCambiar={setTipo} prefijo="nuevo-tipo" />
    </Modal>
  );
}

export default ModalTipoEntrada;
