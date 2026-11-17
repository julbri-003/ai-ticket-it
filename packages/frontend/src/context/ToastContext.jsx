import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Animated } from "react-native";
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

function ToastItem({ toast, alCerrar }) {
  const tema = useStyledTheme();
  const aparicion = useRef(new Animated.Value(0)).current;
  const Icono = ICONOS[toast.tipo];

  useEffect(() => {
    Animated.spring(aparicion, { toValue: 1, useNativeDriver: true, damping: 18 }).start();
  }, [aparicion]);

  const animacion = {
    opacity: aparicion,
    transform: [
      { translateY: aparicion.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
    ],
  };

  return (
    <Animated.View style={animacion}>
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
