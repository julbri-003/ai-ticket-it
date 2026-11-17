import { useCallback, useRef, useState } from "react";
import { FlatList, Modal as ModalNativo, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import styled, { useTheme } from "styled-components/native";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react-native";
import { useFoco } from "./foco";

function Flecha({ direccion, onPress, disabled, etiqueta }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  const Icono = direccion === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <BotonFlecha
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled }}
      $enfocado={enfocado}
      $inactivo={disabled}
      {...propsFoco}
    >
      <Icono size={20} color={theme.colors.textPrimary} accessible={false} />
    </BotonFlecha>
  );
}

/**
 * Carrusel horizontal con swipe, puntos, contador "3/8" y flechas enfocables.
 * `renderItem(item, indice)` dibuja cada ítem; con `visor` (array de { uri, alt }) se puede abrir
 * un visor a pantalla completa de las imágenes.
 */
export function Carrusel({ items, renderItem, anchoItem, separacion = 12, etiqueta, visor }) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const ancho = anchoItem ?? Math.min(width * 0.78, 340);
  const paso = ancho + separacion;
  const lista = useRef(null);
  const [actual, setActual] = useState(0);
  const [visorAbierto, setVisorAbierto] = useState(false);

  const irA = useCallback(
    (indice) => {
      const destino = Math.max(0, Math.min(items.length - 1, indice));
      lista.current?.scrollToOffset({ offset: destino * paso, animated: true });
      setActual(destino);
    },
    [items.length, paso],
  );

  if (!items?.length) return null;

  return (
    <Contenedor accessibilityLabel={etiqueta}>
      <FlatList
        ref={lista}
        data={items}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={paso}
        decelerationRate="fast"
        keyExtractor={(item, i) => String(item.id ?? i)}
        ItemSeparatorComponent={() => <Separador $ancho={separacion} />}
        onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / paso))}
        renderItem={({ item, index }) => <Item $ancho={ancho}>{renderItem(item, index)}</Item>}
      />
      <Controles>
        <Flecha
          direccion="anterior"
          etiqueta="Anterior"
          onPress={() => irA(actual - 1)}
          disabled={actual === 0}
        />
        <Puntos accessible={false}>
          {items.map((item, i) => (
            <Punto key={String(item.id ?? i)} $activo={i === actual} />
          ))}
        </Puntos>
        <Contador
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${actual + 1} de ${items.length}`}
        >
          {actual + 1}/{items.length}
        </Contador>
        {visor ? (
          <BotonFlecha
            onPress={() => setVisorAbierto(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver a pantalla completa"
          >
            <Maximize2 size={18} color={theme.colors.textPrimary} accessible={false} />
          </BotonFlecha>
        ) : null}
        <Flecha
          direccion="siguiente"
          etiqueta="Siguiente"
          onPress={() => irA(actual + 1)}
          disabled={actual === items.length - 1}
        />
      </Controles>
      {visor ? (
        <VisorPantallaCompleta
          imagenes={visor}
          visible={visorAbierto}
          inicial={actual}
          alCerrar={() => setVisorAbierto(false)}
        />
      ) : null}
    </Contenedor>
  );
}

function VisorPantallaCompleta({ imagenes, visible, inicial, alCerrar }) {
  const { width, height } = useWindowDimensions();
  const [actual, setActual] = useState(inicial);
  return (
    <ModalNativo
      visible={visible}
      animationType="fade"
      onRequestClose={alCerrar}
      statusBarTranslucent
    >
      <FondoVisor accessibilityViewIsModal>
        <FlatList
          data={imagenes}
          horizontal
          pagingEnabled
          initialScrollIndex={inicial}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(img, i) => `${img.uri}-${i}`}
          onMomentumScrollEnd={(e) => setActual(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.uri }}
              contentFit="contain"
              style={{ width, height }}
              accessible
              accessibilityLabel={item.alt}
            />
          )}
        />
        <CerrarVisor
          onPress={alCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar visor"
        >
          <X size={26} color="#ffffff" accessible={false} />
        </CerrarVisor>
        <ContadorVisor>
          {actual + 1}/{imagenes.length}
        </ContadorVisor>
      </FondoVisor>
    </ModalNativo>
  );
}

const Contenedor = styled.View`
  gap: 12px;
`;

const Item = styled.View`
  width: ${({ $ancho }) => $ancho}px;
`;

const Separador = styled.View`
  width: ${({ $ancho }) => $ancho}px;
`;

const Controles = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Puntos = styled.View`
  flex: 1;
  flex-direction: row;
  justify-content: center;
  gap: 6px;
`;

const Punto = styled.View`
  width: ${({ $activo }) => ($activo ? 18 : 6)}px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ theme, $activo }) =>
    $activo ? theme.colors.accentText : theme.colors.borderInput};
`;

const Contador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BotonFlecha = styled.Pressable`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.divider};
  opacity: ${({ $inactivo }) => ($inactivo ? 0.45 : 1)};
`;

const FondoVisor = styled.View`
  flex: 1;
  background-color: #000000;
`;

const CerrarVisor = styled.Pressable`
  position: absolute;
  top: 48px;
  right: 16px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.55);
`;

const ContadorVisor = styled.Text`
  position: absolute;
  bottom: 40px;
  align-self: center;
  color: #ffffff;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
`;

export default Carrusel;
