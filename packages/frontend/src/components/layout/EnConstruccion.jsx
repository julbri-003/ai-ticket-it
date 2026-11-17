import { Construction } from "lucide-react-native";
import { EmptyState } from "../ui/Basicos";
import { Pantalla } from "./Pantalla";

/** Placeholder de las pantallas que llegan en iteraciones siguientes. */
export function EnConstruccion({ titulo, iteracion }) {
  return (
    <Pantalla>
      <EmptyState
        icono={Construction}
        titulo={titulo}
        mensaje={`Esta pantalla llega en la iteración ${iteracion}.`}
      />
    </Pantalla>
  );
}

export default EnConstruccion;
