import { useCallback, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { MessagesSquare } from "lucide-react-native";
import { ItemConversacion } from "../../components/chat/ItemConversacion";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  DECORATIVO,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  ListaEscalonada,
  Paginacion,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useEventoSocket } from "../../context/SocketContext";
import { useContador } from "../../hooks/useContador";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { agruparConversaciones, mensajesService } from "../../service/mensajesService";

const LIMITE = 10;

/** "N sin leer" que cuenta desde 0 solo la primera vez; después muestra el valor directo. */
function SinLeer({ cantidad, reducido }) {
  const primero = useRef(cantidad);
  const actual = useContador(cantidad, {
    activo: reducido === false && cantidad === primero.current,
    duracion: 800,
  });
  if (!cantidad) return null;
  return (
    <TextoSinLeer accessibilityLabel={`${cantidad} sin leer`} testID="sin-leer">
      {actual ?? cantidad} sin leer
    </TextoSinLeer>
  );
}

/** Encabezado de grupo de la bandeja ("Hoy", "Ayer"…) con un adorno dorado al costado. */
function EncabezadoGrupo({ titulo }) {
  return (
    <FilaGrupo>
      <TituloGrupo accessibilityRole="header">{titulo}</TituloGrupo>
      <AdornoGrupo {...DECORATIVO}>
        <LineaGrupo />
        <EstrellaGrupo>✦</EstrellaGrupo>
      </AdornoGrupo>
    </FilaGrupo>
  );
}

/**
 * Bandeja de mensajes (comprador y organizador): conversaciones por último mensaje, agrupadas
 * en Hoy / Ayer / Esta semana / Antes, con el total sin leer bajo el título.
 */
export function Mensajes({ navigation }) {
  const { usuario, esOrganizador } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true });
  const reducido = useMovimientoReducido();

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const datos = await mensajesService.conversaciones(usuario.id, { pagina, limite: LIMITE });
      setEstado({ cargando: false, datos });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [usuario.id, pagina]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  // Un mensaje nuevo llega como notificación NUEVO_MENSAJE: se recarga la bandeja.
  const alNotificacion = useCallback(
    (n) => {
      if (n?.tipo === "NUEVO_MENSAJE") cargar();
    },
    [cargar],
  );
  useEventoSocket("notificacion:nueva", alNotificacion);

  const { datos } = estado;
  const sinLeer = datos ? datos.items.reduce((s, c) => s + (c.noLeidos ?? 0), 0) : 0;
  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(datos)}>
      <EtiquetaSeccion>Bandeja</EtiquetaSeccion>
      <TituloEscena texto="Tus conversaciones" destacada="conversaciones" />
      {datos ? <SinLeer cantidad={sinLeer} reducido={reducido} /> : null}
      <Lista>
        {estado.cargando && !datos ? (
          <SkeletonLista cantidad={4} />
        ) : estado.error && !datos ? (
          <ErrorState
            titulo="No pudimos cargar tus mensajes"
            mensaje={estado.error.message}
            alReintentar={cargar}
          />
        ) : datos.items.length === 0 ? (
          <EmptyState
            icono={MessagesSquare}
            titulo="Todavía no tenés conversaciones"
            mensaje={
              esOrganizador
                ? "Cuando un comprador te escriba sobre una compra, la vas a ver acá."
                : "Desde el detalle de una compra podés escribirle al organizador."
            }
          />
        ) : (
          <ListaEscalonada reducido={reducido} gap={12} testID="lista-conversaciones">
            {agruparConversaciones(datos.items).flatMap((grupo) => [
              <EncabezadoGrupo key={`grupo-${grupo.titulo}`} titulo={grupo.titulo} />,
              ...grupo.items.map((c) => (
                <ItemConversacion
                  key={c.compraId}
                  conversacion={c}
                  reducido={reducido}
                  onPress={() => navigation.navigate("ChatCompra", { compraId: c.compraId })}
                />
              )),
            ])}
          </ListaEscalonada>
        )}
      </Lista>
      {datos ? (
        <Paginacion pagina={pagina} total={datos.total} limite={LIMITE} onCambiar={setPagina} />
      ) : null}
    </Pantalla>
  );
}

const Lista = styled.View`
  gap: 12px;
`;

const TextoSinLeer = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const FilaGrupo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
`;

const TituloGrupo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacingLabel}px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.gold};
`;

const AdornoGrupo = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 6px;
`;

const LineaGrupo = styled.View`
  flex: 1;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.goldOrnament};
`;

const EstrellaGrupo = styled.Text`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.goldOrnament};
`;

export default Mensajes;
