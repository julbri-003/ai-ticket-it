import { Animated } from "react-native";
import { Image } from "expo-image";
import styled, { useTheme } from "styled-components/native";
import { Theater } from "lucide-react-native";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { useHundir } from "./Teatro";

// Piezas de la identidad "Telón de terciopelo": TicketCard, TituloEscena, EtiquetaSeccion e
// ImagenEvento.

// ----- TicketCard -----

/**
 * Card con forma de entrada: radio 18px, muescas semicirculares laterales y línea punteada que
 * separa el talón (fondo `ticketStub`). Base de TarjetaEvento, TarjetaCompra y stat cards.
 * `perforacion="puntos"` cambia la línea por una fila de agujeritos (hero de la landing).
 */
export function TicketCard({
  children,
  talon,
  onPress,
  accessibilityLabel,
  testID,
  perforacion = "guiones",
  ...resto
}) {
  const contenido = (
    <>
      <Cuerpo>{children}</Cuerpo>
      {talon ? (
        <>
          <Perforacion accessible={false}>
            <Muesca $lado="izquierda" />
            {perforacion === "puntos" ? (
              <LineaPuntos testID="perforacion-puntos">
                {Array.from({ length: 22 }, (_, i) => (
                  <PuntoPerforado key={i} />
                ))}
              </LineaPuntos>
            ) : (
              <LineaPunteada />
            )}
            <Muesca $lado="derecha" />
          </Perforacion>
          <Talon>{talon}</Talon>
        </>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <TicketPresionableQueSeHunde
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        {...resto}
      >
        {contenido}
      </TicketPresionableQueSeHunde>
    );
  }
  return (
    <Ticket accessibilityLabel={accessibilityLabel} testID={testID} {...resto}>
      {contenido}
    </Ticket>
  );
}

/** Ticket presionable que se hunde (escala 0,97) al tocarlo; quieto con "Reducir movimiento". */
function TicketPresionableQueSeHunde({ children, ...props }) {
  const reducido = useMovimientoReducido();
  const { estilo, alPresionar } = useHundir(reducido);
  return (
    <Animated.View style={estilo}>
      <TicketPresionable accessibilityRole="button" {...alPresionar} {...props}>
        {children}
      </TicketPresionable>
    </Animated.View>
  );
}

const estiloTicket = `
  border-width: 1px;
  overflow: hidden;
`;

const Ticket = styled.View`
  ${estiloTicket}
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-color: ${({ theme }) => theme.colors.divider};
  elevation: 3;
  shadow-color: ${({ theme }) => theme.colors.sombra};
  shadow-opacity: 1;
  shadow-radius: 18px;
  shadow-offset: 0px 10px;
`;

const TicketPresionable = styled.Pressable`
  ${estiloTicket}
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-color: ${({ theme }) => theme.colors.divider};
`;

const Cuerpo = styled.View`
  padding: 16px;
  gap: 8px;
`;

const Perforacion = styled.View`
  height: 20px;
  flex-direction: row;
  align-items: center;
`;

const Muesca = styled.View`
  width: 20px;
  height: 20px;
  border-radius: 10px;
  background-color: ${({ theme }) => theme.colors.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
  margin-left: ${({ $lado }) => ($lado === "izquierda" ? -11 : 0)}px;
  margin-right: ${({ $lado }) => ($lado === "derecha" ? -11 : 0)}px;
`;

const LineaPunteada = styled.View`
  flex: 1;
  height: 0px;
  margin: 0 6px;
  border-top-width: 1.5px;
  border-style: dashed;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const LineaPuntos = styled.View`
  flex: 1;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin: 0 8px;
`;

const PuntoPerforado = styled.View`
  width: 5px;
  height: 5px;
  border-radius: 2.5px;
  background-color: ${({ theme }) => theme.colors.background};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const Talon = styled.View`
  padding: 12px 16px;
  background-color: ${({ theme }) => theme.colors.ticketStub};
`;

/** Texto sobre el talón (contraste garantizado con `onTicketStub`). */
export const TextoTalon = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onTicketStub};
`;

// ----- TituloEscena -----

/**
 * Título en Playfair Display. `destacada` es la palabra (o frase) del texto que va en itálica
 * con el color de acento: <TituloEscena texto="Tu próxima función" destacada="función" />.
 * `color` y `colorDestacada` permiten usarlo sobre fondos de terciopelo (con contraste testeado).
 */
export function TituloEscena({
  texto,
  destacada,
  nivel = "headline",
  centrado = false,
  color,
  colorDestacada,
  testID,
}) {
  const indice = destacada ? texto.indexOf(destacada) : -1;
  return (
    <Titulo
      accessibilityRole="header"
      $nivel={nivel}
      $centrado={centrado}
      $color={color}
      testID={testID}
    >
      {indice >= 0 ? (
        <>
          {texto.slice(0, indice)}
          <Destacada $color={colorDestacada}>{destacada}</Destacada>
          {texto.slice(indice + destacada.length)}
        </>
      ) : (
        texto
      )}
    </Titulo>
  );
}

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme, $nivel }) =>
    theme.typography.sizes[$nivel] ?? theme.typography.sizes.headline}px;
  line-height: ${({ theme, $nivel }) =>
    Math.round((theme.typography.sizes[$nivel] ?? 28) * 1.25)}px;
  color: ${({ theme, $color }) => $color ?? theme.colors.textPrimary};
  text-align: ${({ $centrado }) => ($centrado ? "center" : "left")};
`;

const Destacada = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  color: ${({ theme, $color }) => $color ?? theme.colors.accentText};
`;

// ----- EtiquetaSeccion -----

/** Etiqueta en mayúsculas espaciadas, en dorado y con el ornamento ✦. */
export function EtiquetaSeccion({ children }) {
  return (
    <Etiqueta accessibilityRole="text">
      <Ornamento accessibilityElementsHidden importantForAccessibility="no">
        ✦{" "}
      </Ornamento>
      {children}
    </Etiqueta>
  );
}

const Etiqueta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacingLabel}px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.gold};
`;

const Ornamento = styled.Text`
  color: ${({ theme }) => theme.colors.gold};
`;

// ----- ImagenEvento -----

/**
 * Imagen de evento con expo-image y placeholder. `alt` es obligatorio (texto alternativo), salvo
 * que sea `decorativa` (se oculta a los lectores de pantalla).
 */
export function ImagenEvento({ uri, alt, decorativa = false, relacion = 16 / 9, radio, testID }) {
  const theme = useTheme();
  if (!alt && !decorativa && process.env.NODE_ENV !== "production") {
    console.warn("ImagenEvento: falta `alt` (o marcala como `decorativa`).");
  }
  const accesibilidad = decorativa
    ? { accessible: false, importantForAccessibility: "no-hide-descendants" }
    : { accessible: true, accessibilityRole: "image", accessibilityLabel: alt };

  return (
    <MarcoImagen
      $relacion={relacion}
      $radio={radio ?? theme.borderRadius.md}
      {...accesibilidad}
      testID={testID}
    >
      {uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: "100%" }}
          accessible={false}
        />
      ) : (
        <Placeholder>
          <Theater
            size={36}
            color={theme.colors.goldOrnament}
            strokeWidth={1.5}
            accessible={false}
          />
        </Placeholder>
      )}
    </MarcoImagen>
  );
}

const MarcoImagen = styled.View`
  width: 100%;
  aspect-ratio: ${({ $relacion }) => $relacion};
  border-radius: ${({ $radio }) => $radio}px;
  overflow: hidden;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const Placeholder = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
`;
