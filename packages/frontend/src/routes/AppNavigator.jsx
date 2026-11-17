import { NavigationContainer } from "@react-navigation/native";
import { useTheme } from "styled-components/native";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui/Basicos";
import { Pantalla } from "../components/layout/Pantalla";
import { AuthStack } from "./AuthStack";
import { CompradorTabs } from "./CompradorTabs";
import { OrganizadorTabs } from "./OrganizadorTabs";
import { temaNavegacion } from "./opcionesNavegacion";

/**
 * Navegador raíz: elige el stack según la sesión y el rol. Al cerrar sesión (o si vence el
 * token) `usuario` pasa a null y se vuelve solo al AuthStack.
 */
export function AppNavigator() {
  const theme = useTheme();
  const { usuario, cargando, esComprador, esOrganizador } = useAuth();

  if (cargando) {
    return (
      <Pantalla scroll={false} edges={["top", "bottom"]}>
        <Spinner etiqueta="Restaurando tu sesión" />
      </Pantalla>
    );
  }

  return (
    <NavigationContainer theme={temaNavegacion(theme)}>
      {!usuario ? (
        <AuthStack />
      ) : esComprador ? (
        <CompradorTabs />
      ) : esOrganizador ? (
        <OrganizadorTabs />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

export default AppNavigator;
