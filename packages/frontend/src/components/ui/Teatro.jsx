import { Children, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import styled, { useTheme } from "styled-components/native";

// Adornos de la identidad "Telón de terciopelo" (spec 07b). Todos son decorativos: quedan fuera
// del lector de pantalla y no reciben toques. Las animaciones usan el driver nativo (hilo de UI)
// y respetan "Reducir movimiento": con `reducido` se muestran directamente en su estado final.

/** Props para ocultar un adorno al lector de pantalla y a los toques. */
export const DECORATIVO = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
  pointerEvents: "none",
};

const MARCO_TELON = 14; // ancho visible de cada paño con el telón abierto
const ALTO_CENEFA = 30;

// ----- Telón -----

function Pano({ lado, id }) {
  const theme = useTheme();
  const { velvet, velvetShade, goldOrnament } = theme.colors;
  const pliegues = [0, 0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88, 1];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {pliegues.map((offset, i) => (
            <Stop key={offset} offset={offset} stopColor={i % 2 ? velvetShade : velvet} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" fill={`url(#${id})`} />
      {/* Ribete dorado del lado que da al escenario. */}
      <Rect
        x={lado === "izquierda" ? 98.5 : 0}
        y="0"
        width="1.5"
        height="100"
        fill={goldOrnament}
      />
    </Svg>
  );
}

function Cenefa() {
  const theme = useTheme();
  const { velvet, velvetShade, goldOrnament } = theme.colors;
  // Festones: una onda cada 10 unidades del ancho (ida para el ribete, vuelta para el relleno).
  const ondas = Array.from({ length: 10 }, (_, i) => i);
  const ida = ondas.map((i) => `Q ${i * 10 + 5} 30 ${i * 10 + 10} 18`).join(" ");
  const vuelta = [...ondas]
    .reverse()
    .map((i) => `Q ${i * 10 + 5} 30 ${i * 10} 18`)
    .join(" ");
  return (
    <Svg width="100%" height={ALTO_CENEFA} viewBox="0 0 100 30" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="cenefa" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={velvetShade} />
          <Stop offset="1" stopColor={velvet} />
        </LinearGradient>
      </Defs>
      <Path d={`M 0 0 L 100 0 L 100 18 ${vuelta} Z`} fill="url(#cenefa)" />
      <Path d={`M 0 18 ${ida}`} stroke={goldOrnament} strokeWidth="1.2" fill="none" />
    </Svg>
  );
}

/**
 * Envuelve el hero con un telón: cenefa con festones dorados arriba y dos paños que se corren a
 * los costados una sola vez (≈900 ms) y quedan como marco lateral angosto.
 */
export function ConTelon({ children, reducido, testID = "telon" }) {
  const [ancho, setAncho] = useState(0);
  const progreso = useRef(new Animated.Value(0)).current;
  const abierto = useRef(false);

  useEffect(() => {
    if (abierto.current || reducido == null || ancho === 0) return;
    abierto.current = true;
    if (reducido) {
      progreso.setValue(1);
      return;
    }
    Animated.timing(progreso, {
      toValue: 1,
      duration: 900,
      delay: 250,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [reducido, ancho, progreso]);

  const recorrido = Math.max(ancho / 2 - MARCO_TELON, 0);
  const desplazar = (signo) => ({
    transform: [
      {
        translateX: progreso.interpolate({
          inputRange: [0, 1],
          outputRange: [0, signo * recorrido],
        }),
      },
    ],
  });

  return (
    <MarcoTelon onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {children}
      <CapaTelon {...DECORATIVO} testID={testID}>
        <PanoAnimado style={[{ left: 0 }, desplazar(-1)]}>
          <Pano lado="izquierda" id="pano-izquierdo" />
        </PanoAnimado>
        <PanoAnimado style={[{ right: 0 }, desplazar(1)]}>
          <Pano lado="derecha" id="pano-derecho" />
        </PanoAnimado>
        <Cenefa />
      </CapaTelon>
    </MarcoTelon>
  );
}

const MarcoTelon = styled.View`
  padding: ${ALTO_CENEFA + 4}px ${MARCO_TELON + 4}px 0;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
`;

const CapaTelon = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

const PanoAnimado = styled(Animated.View)`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
`;

// ----- Reflector -----

/** Halo dorado radial detrás del título (opacidad `theme.colors.reflector`, contraste testeado). */
export function Reflector({ alto = 240 }) {
  const theme = useTheme();
  return (
    <CapaReflector {...DECORATIVO} $alto={alto} testID="reflector">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="reflector" cx="50%" cy="35%" rx="60%" ry="55%">
            <Stop
              offset="0"
              stopColor={theme.colors.goldOrnament}
              stopOpacity={theme.colors.reflector}
            />
            <Stop offset="1" stopColor={theme.colors.goldOrnament} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#reflector)" />
      </Svg>
    </CapaReflector>
  );
}

const CapaReflector = styled.View`
  position: absolute;
  top: -16px;
  left: -16px;
  right: -16px;
  height: ${({ $alto }) => $alto}px;
`;

// ----- Sello -----

/**
 * Sello rotado con borde doble ("Estreno", "Para vos", "Sala llena"). `variante="cancelado"`
 * lo pinta con el texto del estado CANCELADA (contraste testeado sobre surface). `style`
 * permite reubicarlo (por defecto, arriba a la derecha de su contenedor).
 */
export function Sello({
  children = "Estreno",
  variante = "dorado",
  chico = false,
  style,
  testID = "sello",
}) {
  return (
    <SelloExterior {...DECORATIVO} testID={testID} $variante={variante} style={style}>
      <SelloInterior $variante={variante} $chico={chico}>
        <TextoSello $variante={variante} $chico={chico}>
          {children}
        </TextoSello>
      </SelloInterior>
    </SelloExterior>
  );
}

const colorSello = ({ theme, $variante }) =>
  $variante === "cancelado" ? theme.colors.estados.CANCELADA.texto : theme.colors.goldOrnament;

const SelloExterior = styled.View`
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 2px;
  border-width: 1.5px;
  border-radius: 8px;
  border-color: ${colorSello};
  background-color: ${({ theme }) => theme.colors.surface};
  transform: rotate(${({ $variante }) => ($variante === "cancelado" ? -14 : -8)}deg);
`;

const SelloInterior = styled.View`
  padding: ${({ $chico }) => ($chico ? "1px 5px" : "2px 10px")};
  border-width: 1px;
  border-radius: 6px;
  border-color: ${colorSello};
`;

const TextoSello = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme, $chico }) =>
    $chico ? theme.typography.sizes.caption : theme.typography.sizes.bodySm}px;
  color: ${({ theme, $variante }) =>
    $variante === "cancelado" ? theme.colors.estados.CANCELADA.texto : theme.colors.gold};
`;

// ----- Marquesina -----

const LAMPARAS_POR_FILA = 14;
// Tres grupos desfasados: cada lamparita titila entre 0,55 y 1 a su turno.
const FASES = [
  [1, 0.55, 0.55, 1],
  [0.55, 1, 0.55, 0.55],
  [0.55, 0.55, 1, 0.55],
];

function FilaLamparas({ titileo }) {
  return (
    <Lamparas {...DECORATIVO}>
      {Array.from({ length: LAMPARAS_POR_FILA }, (_, i) => (
        <Lampara
          key={i}
          style={{
            opacity: titileo
              ? titileo.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: FASES[i % 3] })
              : 1,
          }}
        />
      ))}
    </Lamparas>
  );
}

/**
 * Marco de marquesina de teatro con lamparitas que titilan (ciclo de 2,4 s). Quietas y
 * encendidas con `reducido` o cuando la pantalla no está en foco (`animar=false`).
 */
export function Marquesina({ children, reducido, animar = true }) {
  const titileo = useRef(new Animated.Value(0)).current;
  const encendida = animar && reducido === false;

  useEffect(() => {
    if (!encendida) {
      titileo.stopAnimation();
      titileo.setValue(0);
      return undefined;
    }
    const bucle = Animated.loop(
      Animated.timing(titileo, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    bucle.start();
    return () => bucle.stop();
  }, [encendida, titileo]);

  return (
    <MarcoMarquesina>
      <FilaLamparas titileo={encendida ? titileo : null} />
      <ContenidoMarquesina>{children}</ContenidoMarquesina>
      <FilaLamparas titileo={encendida ? titileo : null} />
    </MarcoMarquesina>
  );
}

const MarcoMarquesina = styled.View`
  padding: 10px 14px;
  gap: 10px;
  border-width: 1.5px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  border-color: ${({ theme }) => theme.colors.goldOrnament};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const ContenidoMarquesina = styled.View`
  gap: 4px;
`;

const Lamparas = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const Lampara = styled(Animated.View)`
  width: 6px;
  height: 6px;
  border-radius: 3px;
  background-color: ${({ theme }) => theme.colors.goldOrnament};
`;

// ----- Ornamento -----

/** Separador ✦ ──── ✦ en dorado entre secciones. */
export function Ornamento() {
  return (
    <FilaOrnamento {...DECORATIVO} testID="ornamento">
      <Estrella>✦</Estrella>
      <Linea />
      <Estrella>✦</Estrella>
    </FilaOrnamento>
  );
}

const FilaOrnamento = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const Estrella = styled.Text`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.goldOrnament};
`;

const Linea = styled.View`
  width: 96px;
  height: 1px;
  background-color: ${({ theme }) => theme.colors.goldOrnament};
`;

// ----- Perforación vertical -----

/** Columna de puntitos que une un paso con el siguiente ("¿Cómo funciona?"). */
export function PerforacionVertical() {
  return (
    <ColumnaPuntos {...DECORATIVO}>
      {[0, 1, 2, 3, 4].map((i) => (
        <PuntoPerforacion key={i} />
      ))}
    </ColumnaPuntos>
  );
}

const ColumnaPuntos = styled.View`
  flex: 1;
  min-height: 28px;
  align-items: center;
  justify-content: space-around;
  padding: 4px 0;
`;

const PuntoPerforacion = styled.View`
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme }) => theme.colors.divider};
`;

// ----- Terciopelo (fondo del banner) -----

/** Textura de pliegues sutil (≤ 8 %) sobre fondo `velvet`. */
export function TexturaPliegues() {
  const franjas = Array.from({ length: 9 }, (_, i) => i / 8);
  return (
    <CapaAbsoluta {...DECORATIVO}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="pliegues-banner" x1="0" y1="0" x2="1" y2="0">
            {franjas.map((offset, i) => (
              <Stop
                key={offset}
                offset={offset}
                stopColor={i % 2 ? "#000000" : "#ffffff"}
                stopOpacity={0.08}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#pliegues-banner)" />
      </Svg>
    </CapaAbsoluta>
  );
}

const CapaAbsoluta = styled.View`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`;

/** Fleco dorado (borlas) para el borde inferior del terciopelo. */
export function Fleco() {
  return (
    <FilaFleco {...DECORATIVO} testID="fleco">
      {Array.from({ length: 18 }, (_, i) => (
        <Borla key={i}>
          <Hilo />
          <Bolita />
        </Borla>
      ))}
    </FilaFleco>
  );
}

const FilaFleco = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 0 8px;
`;

const Borla = styled.View`
  align-items: center;
`;

const Hilo = styled.View`
  width: 1.5px;
  height: 8px;
  background-color: ${({ theme }) => theme.colors.goldOnVelvet};
`;

const Bolita = styled.View`
  width: 5px;
  height: 5px;
  border-radius: 2.5px;
  background-color: ${({ theme }) => theme.colors.goldOnVelvet};
`;

// ----- Entrada de secciones -----

/**
 * Aparece con fade + subida de 12 px la primera vez que `visible` es true. Con `reducido`
 * se muestra de entrada. `alMedir(y)` informa su posición (para scroll a anclas).
 */
export function Revelar({ children, visible, reducido, alMedir, testID }) {
  const progreso = useRef(new Animated.Value(reducido ? 1 : 0)).current;
  const mostrado = useRef(false);

  useEffect(() => {
    if (mostrado.current || reducido == null) return;
    if (reducido) {
      mostrado.current = true;
      progreso.setValue(1);
    } else if (visible) {
      mostrado.current = true;
      Animated.timing(progreso, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, reducido, progreso]);

  return (
    <Animated.View
      testID={testID}
      onLayout={alMedir ? (e) => alMedir(e.nativeEvent.layout.y) : undefined}
      style={{
        gap: 12,
        opacity: progreso,
        transform: [
          { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ----- Telón cerrado (estados vacíos) -----

/** Telón cerrado en miniatura (sin animación): fondo de la escena de los estados vacíos. */
export function TelonCerrado({ testID = "telon-cerrado" }) {
  return (
    <CapaAbsoluta {...DECORATIVO} testID={testID}>
      <PanoFijo style={{ left: 0 }}>
        <Pano lado="izquierda" id="pano-vacio-izquierdo" />
      </PanoFijo>
      <PanoFijo style={{ right: 0 }}>
        <Pano lado="derecha" id="pano-vacio-derecho" />
      </PanoFijo>
      <Cenefa />
    </CapaAbsoluta>
  );
}

const PanoFijo = styled.View`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
`;

// ----- Tarjetas que se hunden -----

/**
 * Feedback al presionar: escala 0,97 y vuelve (resorte, driver nativo). Con `reducido` no escala.
 * Devuelve el estilo para un Animated.View y los handlers para el Pressable.
 */
export function useHundir(reducido) {
  const escala = useRef(new Animated.Value(1)).current;
  const hundir = (valor) => {
    if (reducido !== false) return;
    Animated.spring(escala, {
      toValue: valor,
      speed: 40,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
  };
  return {
    estilo: { transform: [{ scale: escala }] },
    alPresionar: { onPressIn: () => hundir(0.97), onPressOut: () => hundir(1) },
  };
}

// ----- Entrada escalonada de listas -----

export const MAX_ESCALONADOS = 6;

function ItemEscalonado({ children, estado, indice, testID }) {
  const progreso = useRef(new Animated.Value(estado === "fijo" ? 1 : 0)).current;
  const hecho = useRef(estado === "fijo");

  useEffect(() => {
    if (hecho.current || estado === "pendiente") return;
    hecho.current = true;
    if (estado === "fijo") {
      progreso.setValue(1);
      return;
    }
    Animated.timing(progreso, {
      toValue: 1,
      duration: 380,
      delay: indice * 60,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [estado, indice, progreso]);

  return (
    <Animated.View
      testID={testID}
      style={{
        opacity: progreso,
        transform: [
          { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Lista cuyos primeros ítems (hasta 6) aparecen con fade + subida de 12 px, escalonados 60 ms.
 * Solo anima lo que muestra la primera vez: lo que llega después (otra página, un refresco) se
 * muestra directo. Con `reducido` o `animar=false` no anima nada.
 */
export function ListaEscalonada({ children, reducido, animar = true, gap = 16, testID }) {
  const items = Children.toArray(children);
  const claves = useRef(null);
  if (claves.current === null && (reducido != null || !animar) && items.length > 0) {
    claves.current =
      reducido || !animar
        ? new Set()
        : new Set(items.slice(0, MAX_ESCALONADOS).map((item) => item.key));
  }

  return (
    <Animated.View style={{ gap }} testID={testID}>
      {items.map((item, indice) => {
        const estado =
          claves.current === null ? "pendiente" : claves.current.has(item.key) ? "animar" : "fijo";
        return (
          <ItemEscalonado
            key={item.key}
            estado={estado}
            indice={indice}
            testID={testID ? `${testID}-item-${indice}` : undefined}
          >
            {item}
          </ItemEscalonado>
        );
      })}
    </Animated.View>
  );
}
