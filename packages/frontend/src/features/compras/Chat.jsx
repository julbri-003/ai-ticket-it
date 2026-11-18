import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { MessagesSquare, WifiOff } from "lucide-react-native";
import { BurbujaMensaje } from "../../components/chat/BurbujaMensaje";
import { EntradaMensaje } from "../../components/chat/EntradaMensaje";
import { SeparadorDia } from "../../components/chat/SeparadorDia";
import { Pantalla } from "../../components/layout/Pantalla";
import { EmptyState, ErrorState, EstadoCompraBadge, SkeletonLista } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useChatCompra } from "../../hooks/useChatCompra";
import { useEstadoCompra } from "../../hooks/useEstadoCompra";
import { comprasService } from "../../service/comprasService";
import { conSeparadores } from "../../service/mensajesService";
import { sugerenciasChat } from "../../service/sugerenciasService";

/**
 * Chat de una compra (comprador ↔ organizador), disponible en cualquier estado. Cabecera con el
 * evento y el estado (se actualiza con `compra:estado`), burbujas con separadores por día y
 * aviso cuando funciona por polling (sin socket).
 */
export function Chat({ route }) {
  const theme = useTheme();
  const { compraId } = route.params;
  const { usuario } = useAuth();
  const chat = useChatCompra(compraId);
  const [compra, setCompra] = useState(null);
  const lista = useRef(null);

  const cargarCompra = useCallback(() => {
    comprasService
      .detalle(compraId, usuario.id)
      .then(setCompra)
      .catch(() => {});
  }, [compraId, usuario.id]);

  useEffect(() => {
    cargarCompra();
  }, [cargarCompra]);

  useEstadoCompra(compraId, ({ estado }) => {
    setCompra((c) => (c ? { ...c, estado } : c));
  });

  const filas = conSeparadores(chat.mensajes);
  const otro = compra?.esOrganizador ? "el comprador" : "el organizador";
  // Mensajes sugeridos (spec 11): mientras el usuario no haya escrito nada en esta conversación.
  const [sugerenciasOcultas, setSugerenciasOcultas] = useState(false);
  const yaEscribio = chat.mensajes.some((m) => m.propio);
  const sugerencias =
    compra && !chat.cargando && !yaEscribio && !sugerenciasOcultas
      ? sugerenciasChat({ rol: compra.esOrganizador ? "ORGANIZADOR" : "COMPRADOR", compra })
      : [];

  return (
    <Pantalla scroll={false} sinPadding>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <Cabecera>
          <Textos>
            <Evento numberOfLines={1} accessibilityRole="header">
              {compra?.evento.nombre ?? "Chat de la compra"}
            </Evento>
            {compra ? (
              <Detalle numberOfLines={1}>
                {compra.cantidad} × {compra.tipoEntrada} · {compra.evento.fechaTexto}
              </Detalle>
            ) : null}
          </Textos>
          {compra ? <EstadoCompraBadge estado={compra.estado} /> : null}
        </Cabecera>
        {!chat.conectado ? (
          <AvisoConexion accessibilityRole="alert" testID="aviso-polling">
            <WifiOff size={14} color={theme.colors.textSecondary} accessible={false} />
            <TextoAviso>
              Sin conexión en tiempo real: buscamos mensajes nuevos cada 10 s.
            </TextoAviso>
          </AvisoConexion>
        ) : null}

        {chat.cargando && chat.mensajes.length === 0 ? (
          <Relleno>
            <SkeletonLista cantidad={3} />
          </Relleno>
        ) : chat.error && chat.mensajes.length === 0 ? (
          <Relleno>
            <ErrorState
              titulo="No pudimos cargar el chat"
              mensaje={chat.error.message}
              alReintentar={chat.recargar}
            />
          </Relleno>
        ) : (
          <FlatList
            ref={lista}
            data={filas}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => lista.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <EmptyState
                icono={MessagesSquare}
                titulo="Todavía no hay mensajes"
                mensaje={
                  sugerencias.length
                    ? `Empezá con un mensaje sugerido o escribile a ${otro}.`
                    : `Escribile a ${otro}: el chat está disponible en cualquier estado de la compra.`
                }
              />
            }
            renderItem={({ item }) =>
              item.tipo === "dia" ? (
                <SeparadorDia texto={item.texto} />
              ) : (
                <BurbujaMensaje mensaje={item} onReintentar={chat.reintentar} />
              )
            }
            testID="lista-mensajes"
          />
        )}
        <EntradaMensaje
          onEnviar={chat.enviar}
          sugerencias={sugerencias}
          onOcultarSugerencias={() => setSugerenciasOcultas(true)}
        />
      </KeyboardAvoidingView>
    </Pantalla>
  );
}

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const Textos = styled.View`
  flex: 1;
  gap: 2px;
`;

const Evento = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Detalle = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const AvisoConexion = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoAviso = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Relleno = styled.View`
  flex: 1;
  padding: 16px;
`;

export default Chat;
