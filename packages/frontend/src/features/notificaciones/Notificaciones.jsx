import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { BellOff, CheckCheck, Trash2 } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { ItemNotificacion } from "../../components/notificaciones/ItemNotificacion";
import {
  Button,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  ModalConfirmacion,
  Paginacion,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useNotificaciones } from "../../context/NotificacionesContext";
import { useToast } from "../../context/ToastContext";
import { notificacionesService } from "../../service/notificacionesService";

const LIMITE = 15;

/**
 * Centro de notificaciones: lista paginada con las no leídas resaltadas. Una se marca leída al
 * tocarla (y abre la compra, el chat o el evento), deslizándola o con su check. Además, "Marcar
 * todas como leídas" y "Limpiar" (baja lógica de todas, con confirmación: no se recuperan).
 */
export function Notificaciones({ navigation }) {
  const toast = useToast();
  const { noLeidas, marcarLeida, marcarTodas, limpiar, ultima } = useNotificaciones();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true });
  const [marcando, setMarcando] = useState(false);
  const [confirmarLimpiar, setConfirmarLimpiar] = useState(false);
  const [limpiando, setLimpiando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({
        cargando: false,
        datos: await notificacionesService.listar({ pagina, limite: LIMITE }),
      });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [pagina]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Si llega una nueva con la pantalla abierta, se recarga la lista.
  useEffect(() => {
    if (ultima) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ultima]);

  const marcarEnLista = (cambiar) =>
    setEstado((e) =>
      e.datos ? { ...e, datos: { ...e.datos, items: e.datos.items.map(cambiar) } } : e,
    );

  /** Optimista: se ve leída en el acto; si el back falla, vuelve a no leída con un aviso. */
  const leer = async (n) => {
    if (n.leida) return;
    marcarEnLista((x) => (x.id === n.id ? { ...x, leida: true } : x));
    try {
      await marcarLeida(n.id);
    } catch (error) {
      marcarEnLista((x) => (x.id === n.id ? { ...x, leida: false } : x));
      toast.error(error.message, "No pudimos marcarla como leída");
    }
  };

  const abrir = (n) => {
    leer(n);
    if (n.destino) navigation.navigate(n.destino.pantalla, n.destino.params);
  };

  const todas = async () => {
    setMarcando(true);
    try {
      await marcarTodas();
      marcarEnLista((x) => ({ ...x, leida: true }));
    } catch (error) {
      toast.error(error.message, "No pudimos marcarlas como leídas");
    } finally {
      setMarcando(false);
    }
  };

  const confirmarLimpieza = async () => {
    setLimpiando(true);
    try {
      const eliminadas = await limpiar();
      setPagina(1);
      setEstado({ cargando: false, datos: { items: [], total: 0, pagina: 1, limite: LIMITE } });
      toast.success(
        `Se ${eliminadas === 1 ? "borró 1 notificación" : `borraron ${eliminadas} notificaciones`}.`,
        "Notificaciones limpias",
      );
    } catch (error) {
      toast.error(error.message, "No pudimos limpiar las notificaciones");
    } finally {
      setLimpiando(false);
      setConfirmarLimpiar(false);
    }
  };

  const { datos } = estado;
  const vacia = !datos || datos.total === 0;
  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(datos)}>
      <Cabecera>
        <Textos>
          <EtiquetaSeccion>Avisos</EtiquetaSeccion>
          <TituloEscena texto="Notificaciones" destacada="Notificaciones" />
        </Textos>
        <Acciones>
          <Button
            variant="outline"
            size="sm"
            icono={CheckCheck}
            onPress={todas}
            loading={marcando}
            disabled={noLeidas === 0}
            testID="marcar-todas"
          >
            Marcar todas como leídas
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icono={Trash2}
            onPress={() => setConfirmarLimpiar(true)}
            disabled={vacia}
            testID="limpiar-notificaciones"
          >
            Limpiar
          </Button>
        </Acciones>
        {!vacia ? (
          <Ayuda>
            Deslizá una notificación hacia la izquierda o tocá ✓ para marcarla como leída.
          </Ayuda>
        ) : null}
      </Cabecera>

      <Lista>
        {estado.cargando && !datos ? (
          <SkeletonLista cantidad={4} />
        ) : estado.error && !datos ? (
          <ErrorState
            titulo="No pudimos cargar tus notificaciones"
            mensaje={estado.error.message}
            alReintentar={cargar}
          />
        ) : datos.items.length === 0 ? (
          <EmptyState
            icono={BellOff}
            titulo="No tenés notificaciones"
            mensaje="Te avisamos acá cada vez que cambie una compra o te escriban."
          />
        ) : (
          datos.items.map((n) => (
            <ItemNotificacion key={n.id} notificacion={n} onAbrir={abrir} onMarcarLeida={leer} />
          ))
        )}
      </Lista>
      {datos ? (
        <Paginacion pagina={pagina} total={datos.total} limite={LIMITE} onCambiar={setPagina} />
      ) : null}

      <ModalConfirmacion
        visible={confirmarLimpiar}
        titulo="¿Limpiar las notificaciones?"
        mensaje="Se van a borrar todas tus notificaciones. Ya no las vas a poder recuperar."
        textoConfirmar="Limpiar"
        textoCancelar="Volver"
        peligro
        cargando={limpiando}
        alConfirmar={confirmarLimpieza}
        alCancelar={() => setConfirmarLimpiar(false)}
      />
    </Pantalla>
  );
}

const Cabecera = styled.View`
  gap: 12px;
`;

const Textos = styled.View`
  gap: 6px;
`;

const Acciones = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const Ayuda = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Lista = styled.View`
  gap: 12px;
`;

export default Notificaciones;
