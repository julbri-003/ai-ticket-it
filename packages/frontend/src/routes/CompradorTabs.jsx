import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { Compass, Heart, MessageCircle, Ticket, UserRound } from "lucide-react-native";
import { Encabezado } from "../components/layout/Encabezado";
import { EnConstruccion } from "../components/layout/EnConstruccion";
import { Perfil } from "../features/perfil/Perfil";
import { Explorar } from "../features/eventos/Explorar";
import { DetalleEvento } from "../features/eventos/DetalleEvento";
import { Checkout } from "../features/compras/Checkout";
import { DetalleCompra } from "../features/compras/DetalleCompra";
import { MisCompras } from "../features/compras/MisCompras";
import { Favoritos } from "../features/favoritos/Favoritos";
import { opcionesStack, opcionesTabs } from "./opcionesNavegacion";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Mensajes = () => <EnConstruccion titulo="Mensajes" iteracion="10" />;
const Notificaciones = () => <EnConstruccion titulo="Notificaciones" iteracion="10" />;
const ChatCompra = () => <EnConstruccion titulo="Chat con el organizador" iteracion="10" />;

const icono = (Icono) =>
  function IconoTab({ color, size }) {
    return <Icono color={color} size={size} strokeWidth={1.75} />;
  };

/** Tabs del comprador: Explorar, Mis compras, Favoritos, Mensajes y Perfil. */
function TabsComprador() {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...opcionesTabs(theme),
        header: ({ options }) => <Encabezado titulo={options.title ?? route.name} />,
      })}
    >
      <Tabs.Screen
        name="Explorar"
        component={Explorar}
        options={{ title: "Explorar", tabBarIcon: icono(Compass) }}
      />
      <Tabs.Screen
        name="MisCompras"
        component={MisCompras}
        options={{ title: "Mis compras", tabBarIcon: icono(Ticket) }}
      />
      <Tabs.Screen
        name="Favoritos"
        component={Favoritos}
        options={{ title: "Favoritos", tabBarIcon: icono(Heart) }}
      />
      <Tabs.Screen
        name="Mensajes"
        component={Mensajes}
        options={{ title: "Mensajes", tabBarIcon: icono(MessageCircle) }}
      />
      <Tabs.Screen
        name="Perfil"
        component={Perfil}
        options={{ title: "Perfil", tabBarIcon: icono(UserRound) }}
      />
    </Tabs.Navigator>
  );
}

/** Stack raíz del comprador: las tabs y las pantallas de detalle (anidadas). */
export function CompradorTabs() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={opcionesStack(theme)}>
      <Stack.Screen
        name="TabsComprador"
        component={TabsComprador}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="DetalleEvento" component={DetalleEvento} options={{ title: "Evento" }} />
      <Stack.Screen name="Checkout" component={Checkout} options={{ title: "Pago" }} />
      <Stack.Screen
        name="DetalleCompra"
        component={DetalleCompra}
        options={{ title: "Tu compra" }}
      />
      <Stack.Screen name="ChatCompra" component={ChatCompra} options={{ title: "Chat" }} />
      <Stack.Screen
        name="Notificaciones"
        component={Notificaciones}
        options={{ title: "Notificaciones" }}
      />
    </Stack.Navigator>
  );
}

export default CompradorTabs;
