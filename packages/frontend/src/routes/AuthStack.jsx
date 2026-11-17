import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "styled-components/native";
import { Landing } from "../features/home/Landing";
import { Login } from "../features/auth/Login";
import { Registro } from "../features/auth/Registro";
import { opcionesStack } from "./opcionesNavegacion";

const Stack = createNativeStackNavigator();

/** Sin sesión: Landing, Login y Registro. */
export function AuthStack() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={{ ...opcionesStack(theme), headerShown: false }}>
      <Stack.Screen name="Landing" component={Landing} />
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Registro" component={Registro} />
    </Stack.Navigator>
  );
}

export default AuthStack;
