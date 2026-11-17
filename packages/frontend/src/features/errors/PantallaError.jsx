import { Component } from "react";
import { WifiOff } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { EmptyState, ErrorState } from "../../components/ui";

/** Pantalla genérica de error con reintento. */
export function PantallaError({
  titulo = "Algo salió mal",
  mensaje = "Ocurrió un error inesperado. Probá de nuevo.",
  alReintentar,
}) {
  return (
    <Pantalla edges={["top", "left", "right", "bottom"]}>
      <ErrorState titulo={titulo} mensaje={mensaje} alReintentar={alReintentar} />
    </Pantalla>
  );
}

/** Sin conexión con el servidor (por ejemplo, IP mal configurada o sin Wi-Fi). */
export function SinConexion({ alReintentar }) {
  return (
    <Pantalla edges={["top", "left", "right", "bottom"]}>
      <EmptyState
        icono={WifiOff}
        titulo="Sin conexión"
        mensaje="No pudimos conectarnos con el servidor. Revisá tu conexión a internet (o que la PC con el back esté en la misma red) e intentá de nuevo."
        accion={alReintentar ? { etiqueta: "Reintentar", alPresionar: alReintentar } : undefined}
      />
    </Pantalla>
  );
}

/** Ante un error de render, muestra PantallaError en lugar de una pantalla en blanco. */
export class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return <PantallaError alReintentar={() => this.setState({ error: null })} />;
    }
    return this.props.children;
  }
}
