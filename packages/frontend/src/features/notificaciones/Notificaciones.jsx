import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled, { useTheme } from "styled-components/native";
import { BellOff, CheckCheck } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  Paginacion,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useNotificaciones } from "../../context/NotificacionesContext";
import { useToast } from "../../context/ToastContext";
import { notificacionesService } from "../../service/notificacionesService";

const LIMITE = 15;

/**
 * Centro de notificaciones: lista paginada, no leídas resaltadas, "Marcar todas como leídas" y, al
 * tocar una, se marca leída y navega a la compra (o al chat) o al evento.
 */
export function Notificaciones({ navigation }) {
  const theme = useTheme();
  const toast = useToast();
  const { noLeidas, marcarLeida, marcarTodas, ultima } = useNotificaciones();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true });
  const [marcando, setMarcando] = useState(false);

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

  const abrir = async (n) => {
    if (!n.leida) {
      setEstado((e) => ({
        ...e,
        datos: {
          ...e.datos,
          items: e.datos.items.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
        },
      }));
      marcarLeida(n.id).catch(() => {});
    }
    if (n.destino) navigation.navigate(n.destino.pantalla, n.destino.params);
  };

  const todas = async () => {
    setMarcando(true);
    try {
      await marcarTodas();
      setEstado((e) => ({
        ...e,
        datos: e.datos && { ...e.datos, items: e.datos.items.map((x) => ({ ...x, leida: true })) },
      }));
    } catch (error) {
      toast.error(error.message, "No pudimos marcarlas como leídas");
    } finally {
      setMarcando(false);
    }
  };

  const { datos } = estado;
  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(datos)}>
      <Cabecera>
        <Textos>
          <EtiquetaSeccion>Avisos</EtiquetaSeccion>
          <TituloEscena texto="Notificaciones" destacada="Notificaciones" />
        </Textos>
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
            <Card
              key={n.id}
              onPress={() => abrir(n)}
              accessibilityLabel={`${n.leida ? "" : "No leída. "}${n.titulo}. ${n.mensaje}. ${n.fechaTexto}`}
              accessibilityHint={n.destino ? "Abre la compra o el evento" : undefined}
              testID={`notificacion-${n.id}`}
              style={
                n.leida
                  ? undefined
                  : {
                      borderLeftWidth: 4,
                      borderLeftColor: theme.colors.primary,
                      backgroundColor: theme.colors.surfaceSubtle,
                    }
              }
            >
              <Fila>
                {!n.leida ? <Punto accessible={false} /> : null}
                <Titulo $leida={n.leida}>{n.titulo}</Titulo>
                <Fecha>{n.fechaTexto}</Fecha>
              </Fila>
              <Mensaje $leida={n.leida}>{n.mensaje}</Mensaje>
            </Card>
          ))
        )}
      </Lista>
      {datos ? (
        <Paginacion pagina={pagina} total={datos.total} limite={LIMITE} onCambiar={setPagina} />
      ) : null}
    </Pantalla>
  );
}

const Cabecera = styled.View`
  gap: 12px;
`;

const Textos = styled.View`
  gap: 6px;
`;

const Lista = styled.View`
  gap: 12px;
`;

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Punto = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const Titulo = styled.Text`
  flex: 1;
  font-family: ${({ theme, $leida }) =>
    $leida ? theme.typography.fontBodyMedium : theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Fecha = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Mensaje = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 20px;
  color: ${({ theme, $leida }) => ($leida ? theme.colors.textSecondary : theme.colors.textPrimary)};
`;

export default Notificaciones;
