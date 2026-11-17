import { useCallback, useEffect, useState } from "react";
import styled from "styled-components/native";
import { Heart } from "lucide-react-native";
import {
  Button,
  Carrusel,
  EmptyState,
  EtiquetaSeccion,
  Reflector,
  SkeletonCard,
  TituloEscena,
} from "../ui";
import { eventosService } from "../../service/eventosService";
import { TarjetaEvento } from "./TarjetaEvento";

/**
 * "Recomendados para vos" (solo comprador): carrusel con el motivo como subtítulo y "Ver todos"
 * (activa el filtro Para vos). Sin favoritos, una tarjeta de estado vacío.
 * Avisa a quien lo usa si hay favoritos (para habilitar la pill Para vos).
 */
export function CarruselRecomendados({ onVerTodos, onAbrirEvento, onDisponibilidad, recargarCon }) {
  const [estado, setEstado] = useState({ cargando: true });

  const cargar = useCallback(async () => {
    try {
      const resultado = await eventosService.recomendados({ limite: 8 });
      setEstado({ cargando: false, ...resultado });
      onDisponibilidad?.(!resultado.sinFavoritos);
    } catch {
      setEstado({ cargando: false, error: true });
    }
  }, [onDisponibilidad]);

  useEffect(() => {
    cargar();
  }, [cargar, recargarCon]);

  if (estado.cargando) return <SkeletonCard />;
  if (estado.error) return null;

  if (estado.sinFavoritos) {
    return (
      <Tarjeta testID="recomendados-vacio">
        <EmptyState
          icono={Heart}
          titulo="Recomendados para vos"
          mensaje="Guardá eventos en favoritos y te recomendamos según lo que te gusta."
        />
      </Tarjeta>
    );
  }

  return (
    <Seccion testID="recomendados">
      <Reflector alto={150} />
      <Cabecera>
        <EtiquetaSeccion>Recomendados para vos</EtiquetaSeccion>
        <Button variant="ghost" size="sm" onPress={onVerTodos}>
          Ver todos
        </Button>
      </Cabecera>
      <TituloEscena texto="Elegidos para vos" destacada="vos" nivel="title" />
      {estado.motivo ? <Motivo>{estado.motivo}</Motivo> : null}
      {estado.items.length > 0 ? (
        <Carrusel
          items={estado.items}
          etiqueta="Recomendados para vos"
          renderItem={(evento) => (
            <TarjetaEvento evento={evento} onPress={() => onAbrirEvento(evento)} sello="Para vos" />
          )}
        />
      ) : (
        <Motivo>
          Ya guardaste o compraste todo lo de esas categorías. ¡Mirá la cartelera completa!
        </Motivo>
      )}
    </Seccion>
  );
}

const Seccion = styled.View`
  gap: 8px;
`;

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Motivo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Tarjeta = styled.View`
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  border-width: 1px;
  border-style: dashed;
  border-color: ${({ theme }) => theme.colors.goldOrnament};
  background-color: ${({ theme }) => theme.colors.surface};
`;

export default CarruselRecomendados;
