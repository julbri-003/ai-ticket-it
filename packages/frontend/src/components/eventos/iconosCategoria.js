import {
  Baby,
  Clapperboard,
  Drama,
  Footprints,
  Mic,
  Music,
  PartyPopper,
  Presentation,
  Trophy,
} from "lucide-react-native";

// Ícono de cada categoría fija del seed (por nombre normalizado). Se usa en la landing y en la
// barra de filtros de Explorar. Una categoría desconocida cae en Clapperboard.
const ICONOS = {
  recitales: Music,
  teatro: Drama,
  "stand-up": Mic,
  festivales: PartyPopper,
  deportes: Trophy,
  conferencias: Presentation,
  infantiles: Baby,
  danza: Footprints,
};

// Marcas diacríticas combinantes (U+0300 a U+036F) que deja normalize("NFD").
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

export const normalizarNombreCategoria = (nombre = "") =>
  nombre.normalize("NFD").replace(DIACRITICOS, "").trim().toLowerCase().replace(/\s+/g, "-");

export function iconoCategoria(nombre) {
  return ICONOS[normalizarNombreCategoria(nombre)] ?? Clapperboard;
}

export default iconoCategoria;
