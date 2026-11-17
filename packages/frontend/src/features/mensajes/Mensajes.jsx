import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { MessagesSquare } from "lucide-react-native";
import { ItemConversacion } from "../../components/chat/ItemConversacion";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  Paginacion,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useEventoSocket } from "../../context/SocketContext";
import { mensajesService } from "../../service/mensajesService";

const LIMITE = 10;

/** Bandeja de mensajes (comprador y organizador): conversaciones por último mensaje. */
export function Mensajes({ navigation }) {
  const { usuario, esOrganizador } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true });

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
  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(datos)}>
      <EtiquetaSeccion>Bandeja</EtiquetaSeccion>
      <TituloEscena texto="Tus conversaciones" destacada="conversaciones" />
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
          datos.items.map((c) => (
            <ItemConversacion
              key={c.compraId}
              conversacion={c}
              onPress={() => navigation.navigate("ChatCompra", { compraId: c.compraId })}
            />
          ))
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

export default Mensajes;
