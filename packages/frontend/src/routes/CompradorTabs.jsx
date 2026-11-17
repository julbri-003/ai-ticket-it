import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { Compass, Heart, MessageCircle, Ticket, UserRound } from "lucide-react-native";
import { Encabezado } from "../components/layout/Encabezado";
import { EnConstruccion } from "../components/layout/EnConstruccion";
import { Perfil } from "../features/perfil/Perfil";
import { opcionesStack, opcionesTabs } from "./opcionesNavegacion";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Explorar = () => <EnConstruccion titulo="Explorar eventos" iteracion="08" />;
const MisCompras = () => <EnConstruccion titulo="Mis compras" iteracion="08" />;
const Favoritos = () => <EnConstruccion titulo="Favoritos" iteracion="08" />;
const Mensajes = () => <EnConstruccion titulo="Mensajes" iteracion="10" />;
const Notificaciones = () => <EnConstruccion titulo="Notificaciones" iteracion="10" />;

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
      <Stack.Screen
        name="Notificaciones"
        component={Notificaciones}
        options={{ title: "Notificaciones" }}
      />
    </Stack.Navigator>
  );
}

export default CompradorTabs;
