import { useCallback, useState } from "react";
import { LayoutAnimation } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import styled, { useTheme } from "styled-components/native";
import { Heart, Trash2 } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { TarjetaEvento } from "../../components/eventos/TarjetaEvento";
import { EmptyState, ErrorState, SkeletonLista, TituloEscena } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { favoritosService } from "../../service/favoritosService";

const ACCIONES_ACCESIBLES = [{ name: "quitar", label: "Quitar de favoritos" }];

/** Acción roja que aparece al deslizar la tarjeta hacia la izquierda. */
function AccionQuitar({ onPress }) {
  const theme = useTheme();
  return (
    <Quitar
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Quitar de favoritos"
      testID="swipe-quitar"
    >
      <Trash2 size={22} color={theme.colors.onError} accessible={false} />
      <TextoQuitar>Quitar</TextoQuitar>
    </Quitar>
  );
}

/**
 * Favoritos (incluso los anteriores, en gris). Se quitan deslizando a la izquierda, con el
 * corazón o con la acción accesible "Quitar de favoritos"; siempre con "Deshacer".
 */
export function Favoritos({ navigation }) {
  const toast = useToast();
  const [estado, setEstado] = useState({ cargando: true });

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({ cargando: false, eventos: await favoritosService.listar() });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const restaurar = useCallback(
    async (evento) => {
      try {
        await favoritosService.agregar(evento.id);
        toast.success(`Volviste a guardar ${evento.nombre}.`, "Favoritos");
      } catch (error) {
        toast.error(error.message, "No pudimos deshacer");
      }
      cargar();
    },
    [cargar, toast],
  );

  const quitar = useCallback(
    async (evento) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setEstado((e) => ({ ...e, eventos: e.eventos.filter((x) => x.id !== evento.id) }));
      try {
        await favoritosService.quitar(evento.id);
        toast.mostrar({
          tipo: "info",
          titulo: "Favoritos",
          mensaje: `Quitaste ${evento.nombre} de favoritos.`,
          accion: { etiqueta: "Deshacer", alPresionar: () => restaurar(evento) },
        });
      } catch (error) {
        toast.error(error.message, "No pudimos quitar el favorito");
        cargar();
      }
    },
    [cargar, restaurar, toast],
  );

  const eventos = estado.eventos ?? [];

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(estado.eventos)}>
      <TituloEscena texto="Tus favoritos" destacada="favoritos" />
      {estado.cargando && !estado.eventos ? (
        <SkeletonLista cantidad={3} />
      ) : estado.error && !estado.eventos ? (
        <ErrorState
          titulo="No pudimos cargar tus favoritos"
          mensaje={estado.error.message}
          alReintentar={cargar}
        />
      ) : eventos.length === 0 ? (
        <EmptyState
          icono={Heart}
          titulo="Todavía no guardaste favoritos"
          mensaje="Tocá el corazón de un evento para guardarlo y recibir recomendaciones."
          accion={{
            etiqueta: "Explorar eventos",
            alPresionar: () => navigation.navigate("Explorar"),
          }}
        />
      ) : (
        <>
          <Ayuda>Deslizá una tarjeta hacia la izquierda para quitarla.</Ayuda>
          <Lista>
            {eventos.map((evento) => (
              <ReanimatedSwipeable
                key={evento.id}
                friction={2}
                rightThreshold={60}
                overshootRight={false}
                renderRightActions={() => <AccionQuitar onPress={() => quitar(evento)} />}
                onSwipeableOpen={() => quitar(evento)}
              >
                <TarjetaEvento
                  evento={evento}
                  onPress={() => navigation.navigate("DetalleEvento", { eventoId: evento.id })}
                  esFavorito
                  onFavorito={() => quitar(evento)}
                  accionesAccesibles={ACCIONES_ACCESIBLES}
                  onAccionAccesible={({ nativeEvent }) =>
                    nativeEvent.actionName === "quitar" && quitar(evento)
                  }
                />
              </ReanimatedSwipeable>
            ))}
          </Lista>
        </>
      )}
    </Pantalla>
  );
}

const Ayuda = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Lista = styled.View`
  gap: 16px;
`;

const Quitar = styled.Pressable`
  width: 96px;
  margin-left: 12px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.error};
`;

const TextoQuitar = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.onError};
`;

export default Favoritos;
