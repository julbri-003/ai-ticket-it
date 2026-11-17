import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled, { useTheme } from "styled-components/native";
import { Bell, MessageCircle } from "lucide-react-native";
import { useNotificaciones } from "../../context/NotificacionesContext";
import { useFoco } from "../ui/foco";

function BotonConContador({ icono: Icono, etiqueta, cantidad, onPress }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  const texto = cantidad > 99 ? "99+" : String(cantidad);
  return (
    <BotonIcono
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={cantidad > 0 ? `${etiqueta}, ${cantidad} sin leer` : etiqueta}
      $enfocado={enfocado}
      {...propsFoco}
    >
      <Icono size={22} color={theme.colors.textPrimary} strokeWidth={1.75} accessible={false} />
      {cantidad > 0 ? (
        <Contador accessible={false}>
          <TextoContador>{texto}</TextoContador>
        </Contador>
      ) : null}
    </BotonIcono>
  );
}

/**
 * Top app bar de las tabs: título de la pantalla + mensajería y campana, cada una con su contador.
 * Los contadores salen de NotificacionesContext (socket + REST).
 */
export function Encabezado({ titulo }) {
  const navigation = useNavigation();
  const { noLeidas: notificaciones, mensajesNoLeidos } = useNotificaciones();

  return (
    <Barra edges={["top", "left", "right"]}>
      <Fila>
        <Marca>
          <Ornamento accessible={false}>✦</Ornamento>
          <TituloBarra accessibilityRole="header" numberOfLines={1}>
            {titulo}
          </TituloBarra>
        </Marca>
        <BotonConContador
          icono={MessageCircle}
          etiqueta="Mensajes"
          cantidad={mensajesNoLeidos}
          onPress={() => navigation.navigate("Mensajes")}
        />
        <BotonConContador
          icono={Bell}
          etiqueta="Notificaciones"
          cantidad={notificaciones}
          onPress={() => navigation.navigate("Notificaciones")}
        />
      </Fila>
    </Barra>
  );
}

const Barra = styled(SafeAreaView)`
  background-color: ${({ theme }) => theme.colors.background};
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.divider};
`;

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 20px;
`;

const Marca = styled.View`
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const Ornamento = styled.Text`
  color: ${({ theme }) => theme.colors.goldOrnament};
  font-size: 16px;
`;

const TituloBarra = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BotonIcono = styled.Pressable`
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 0)}px;
  border-color: ${({ theme }) => theme.colors.focusRing};
`;

const Contador = styled.View`
  position: absolute;
  top: 4px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoContador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: 10px;
  color: ${({ theme }) => theme.colors.onPrimary};
`;

export default Encabezado;
