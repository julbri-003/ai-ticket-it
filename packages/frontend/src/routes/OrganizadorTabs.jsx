import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { Bell, CalendarDays, MessageCircle, PlusCircle, UserRound } from "lucide-react-native";
import { Encabezado } from "../components/layout/Encabezado";
import { EnConstruccion } from "../components/layout/EnConstruccion";
import { DetalleCompra } from "../features/compras/DetalleCompra";
import { ComprasEvento } from "../features/organizador/ComprasEvento";
import { CrearEvento } from "../features/organizador/CrearEvento";
import { EditarEvento } from "../features/organizador/EditarEvento";
import { MisEventos } from "../features/organizador/MisEventos";
import { Perfil } from "../features/perfil/Perfil";
import { opcionesStack, opcionesTabs } from "./opcionesNavegacion";

const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const Mensajes = () => <EnConstruccion titulo="Mensajes" iteracion="10" />;
const Notificaciones = () => <EnConstruccion titulo="Notificaciones" iteracion="10" />;
const ChatCompra = () => <EnConstruccion titulo="Chat con el comprador" iteracion="10" />;

const icono = (Icono) =>
  function IconoTab({ color, size }) {
    return <Icono color={color} size={size} strokeWidth={1.75} />;
  };

/** Tabs del organizador: Mis eventos, Crear, Mensajes, Notificaciones y Perfil. */
function TabsOrganizador() {
  const theme = useTheme();
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        ...opcionesTabs(theme),
        header: ({ options }) => <Encabezado titulo={options.title ?? route.name} />,
      })}
    >
      <Tabs.Screen
        name="MisEventos"
        component={MisEventos}
        options={{ title: "Mis eventos", tabBarIcon: icono(CalendarDays) }}
      />
      <Tabs.Screen
        name="Crear"
        component={CrearEvento}
        options={{ title: "Crear", tabBarIcon: icono(PlusCircle) }}
      />
      <Tabs.Screen
        name="Mensajes"
        component={Mensajes}
        options={{ title: "Mensajes", tabBarIcon: icono(MessageCircle) }}
      />
      <Tabs.Screen
        name="Notificaciones"
        component={Notificaciones}
        options={{ title: "Notificaciones", tabBarIcon: icono(Bell) }}
      />
      <Tabs.Screen
        name="Perfil"
        component={Perfil}
        options={{ title: "Perfil", tabBarIcon: icono(UserRound) }}
      />
    </Tabs.Navigator>
  );
}

/** Stack raíz del organizador: las tabs y las pantallas de detalle (anidadas). */
export function OrganizadorTabs() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={opcionesStack(theme)}>
      <Stack.Screen
        name="TabsOrganizador"
        component={TabsOrganizador}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditarEvento"
        component={EditarEvento}
        options={{ title: "Editar evento" }}
      />
      <Stack.Screen name="ComprasEvento" component={ComprasEvento} options={{ title: "Compras" }} />
      <Stack.Screen name="DetalleCompra" component={DetalleCompra} options={{ title: "Compra" }} />
      <Stack.Screen name="ChatCompra" component={ChatCompra} options={{ title: "Chat" }} />
    </Stack.Navigator>
  );
}

export default OrganizadorTabs;
