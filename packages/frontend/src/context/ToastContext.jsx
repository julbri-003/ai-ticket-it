import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Animated, PanResponder } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import styled, { useTheme as useStyledTheme } from "styled-components/native";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react-native";

const ToastContext = createContext(undefined);

const TITULOS = {
  success: "Listo",
  error: "Algo salió mal",
  warning: "Atención",
  info: "Información",
};
const ICONOS = { success: CheckCircle2, error: AlertCircle, warning: AlertTriangle, info: Info };
const DURACION = 4500;
const DURACION_CON_ACCION = 7000;

let contador = 0;

// Umbrales del swipe para descartar: distancia (px) o velocidad (px/ms).
const UMBRAL_DERECHA = 80;
const UMBRAL_ARRIBA = 40;
const UMBRAL_VELOCIDAD = 0.5;
const SALIDA = 600;

/**
 * Decide si un gesto descarta el aviso: hacia la derecha o hacia arriba, por distancia o por
 * velocidad. Devuelve "derecha", "arriba" o null (vuelve a su lugar). Hacia la izquierda o
 * hacia abajo nunca descarta.
 */
export function direccionDescarte({ dx, dy, vx = 0, vy = 0 }) {
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  if (horizontal && (dx > UMBRAL_DERECHA || (dx > 0 && vx > UMBRAL_VELOCIDAD))) return "derecha";
  if (!horizontal && (dy < -UMBRAL_ARRIBA || (dy < 0 && vy < -UMBRAL_VELOCIDAD))) return "arriba";
  return null;
}

function ToastItem({ toast, alCerrar }) {
  const tema = useStyledTheme();
  const aparicion = useRef(new Animated.Value(0)).current;
  const arrastre = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const Icono = ICONOS[toast.tipo];

  useEffect(() => {
    Animated.spring(aparicion, { toValue: 1, useNativeDriver: true, damping: 18 }).start();
  }, [aparicion]);

  // Swipe para descartar (derecha o arriba). Solo toma el gesto cuando hay movimiento real,
  // así los toques en "Deshacer" y en la X siguen funcionando. La X se conserva para quien no
  // puede o no quiere deslizar (teclado, lector de pantalla).
  const gestos = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 8 || Math.abs(dy) > 8,
      onPanResponderMove: (_, { dx, dy }) => {
        // Solo acompaña el dedo en las direcciones que descartan.
        arrastre.setValue({ x: Math.max(0, dx), y: Math.min(0, dy) });
      },
      onPanResponderRelease: (_, estado) => {
        const direccion = direccionDescarte(estado);
        if (!direccion) {
          Animated.spring(arrastre, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
          return;
        }
        Animated.timing(arrastre, {
          toValue: direccion === "derecha" ? { x: SALIDA, y: 0 } : { x: 0, y: -SALIDA / 3 },
          duration: 180,
          useNativeDriver: true,
        }).start(() => alCerrar(toast.id));
      },
      onPanResponderTerminate: () => {
        Animated.spring(arrastre, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      },
    }),
  ).current;

  const animacion = {
    opacity: Animated.multiply(
      aparicion,
      arrastre.x.interpolate({ inputRange: [0, 250], outputRange: [1, 0.2], extrapolate: "clamp" }),
    ),
    transform: [
      {
        translateY: Animated.add(
          aparicion.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }),
          arrastre.y,
        ),
      },
      { translateX: arrastre.x },
    ],
  };

  return (
    <Animated.View
      style={animacion}
      {...gestos.panHandlers}
      accessibilityHint="Deslizá hacia la derecha o hacia arriba para cerrarlo"
      testID={`toast-swipe-${toast.tipo}`}
    >
      <Tarjeta
        $tipo={toast.tipo}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        testID={`toast-${toast.tipo}`}
      >
        <Icono size={22} color={tema.colors[toast.tipo]} accessible={false} />
        <Contenido>
          <Titulo>{toast.titulo}</Titulo>
          <Mensaje>{toast.mensaje}</Mensaje>
        </Contenido>
        {toast.accion ? (
          <BotonAccion
            onPress={() => {
              toast.accion.alPresionar?.();
              alCerrar(toast.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={toast.accion.etiqueta}
          >
            <TextoAccion>{toast.accion.etiqueta}</TextoAccion>
          </BotonAccion>
        ) : null}
        <BotonCerrar
          onPress={() => alCerrar(toast.id)}
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
        >
          <X size={18} color={tema.colors.textMuted} accessible={false} />
        </BotonCerrar>
      </Tarjeta>
    </Animated.View>
  );
}

/**
 * Avisos efímeros arriba de la pantalla (respetando el notch). Misma API que REPO_REF
 * (success, error, warning, info, showToast) más `mostrar({ tipo, mensaje, titulo, accion })`.
 * Cada aviso se anuncia al lector de pantalla; `accion` permite, por ejemplo, "Deshacer".
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const insets = useSafeAreaInsets();
  const temporizadores = useRef(new Map());

  const cerrar = useCallback((id) => {
    clearTimeout(temporizadores.current.get(id));
    temporizadores.current.delete(id);
    setToasts((previos) => previos.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const pendientes = temporizadores.current;
    return () => pendientes.forEach((t) => clearTimeout(t));
  }, []);

  const mostrar = useCallback(
    ({ tipo = "info", mensaje, titulo, accion, duracion }) => {
      contador += 1;
      const id = `toast_${contador}`;
      const tituloFinal = titulo ?? TITULOS[tipo];
      setToasts((previos) => [
        ...previos.slice(-2),
        { id, tipo, mensaje, titulo: tituloFinal, accion },
      ]);
      AccessibilityInfo.announceForAccessibility?.(`${tituloFinal}. ${mensaje}`);
      temporizadores.current.set(
        id,
        setTimeout(() => cerrar(id), duracion ?? (accion ? DURACION_CON_ACCION : DURACION)),
      );
      return id;
    },
    [cerrar],
  );

  const valor = useMemo(
    () => ({
      mostrar,
      cerrar,
      showToast: ({ type, message, title }) =>
        mostrar({ tipo: type, mensaje: message, titulo: title }),
      success: (mensaje, titulo) => mostrar({ tipo: "success", mensaje, titulo }),
      error: (mensaje, titulo) => mostrar({ tipo: "error", mensaje, titulo }),
      warning: (mensaje, titulo) => mostrar({ tipo: "warning", mensaje, titulo }),
      info: (mensaje, titulo) => mostrar({ tipo: "info", mensaje, titulo }),
    }),
    [mostrar, cerrar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <Contenedor pointerEvents="box-none" style={{ top: insets.top + 8 }}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} alCerrar={cerrar} />
        ))}
      </Contenedor>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast debe usarse dentro de un ToastProvider");
  return contexto;
};

const Contenedor = styled.View`
  position: absolute;
  left: 12px;
  right: 12px;
  z-index: 1000;
  gap: 8px;
`;

const Tarjeta = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 12px 4px 12px 16px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
  border-left-width: 4px;
  border-left-color: ${({ theme, $tipo }) => theme.colors[$tipo]};
  elevation: 6;
  shadow-color: ${({ theme }) => theme.colors.sombra};
  shadow-opacity: 1;
  shadow-radius: 16px;
  shadow-offset: 0px 8px;
`;

const Contenido = styled.View`
  flex: 1;
`;

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Mensaje = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const BotonAccion = styled.Pressable`
  min-height: 44px;
  padding: 0 8px;
  justify-content: center;
`;

const TextoAccion = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.accentText};
`;

const BotonCerrar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;
