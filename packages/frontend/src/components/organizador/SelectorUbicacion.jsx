import { useState } from "react";
import * as Location from "expo-location";
import styled from "styled-components/native";
import { MapPin, Search, X } from "lucide-react-native";
import { HAY_MAPA, MapaInteractivo } from "../mapa/Mapa";
import { Button, Input } from "../ui";
import { CENTRO_POR_DEFECTO, regionDe } from "../../utils/mapas";

/** Estado inicial de la ubicación en el formulario: sin punto y sin dirección. */
export const ubicacionVacia = () => ({ lat: null, lng: null, direccion: "" });

/**
 * "Ubicación en el mapa (opcional)" al crear un evento: dirección exacta + "Buscar en el mapa"
 * (geocodificador del sistema) y un pin que se mueve tocando o arrastrando. Si la búsqueda no
 * encuentra nada o se niega el permiso, el pin se pone a mano.
 */
export function SelectorUbicacion({ valor, onCambiar, error }) {
  const [buscando, setBuscando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [region, setRegion] = useState(() =>
    regionDe(valor?.lat != null ? valor : CENTRO_POR_DEFECTO, 0.02),
  );
  const ubicacion = valor ?? ubicacionVacia();
  const punto = ubicacion.lat != null ? { lat: ubicacion.lat, lng: ubicacion.lng } : null;

  const buscar = async () => {
    const direccion = ubicacion.direccion.trim();
    if (direccion.length < 5) {
      setAviso("Escribí la dirección (calle, número y ciudad) para buscarla.");
      return;
    }
    setBuscando(true);
    setAviso(null);
    try {
      const permiso = await Location.requestForegroundPermissionsAsync();
      if (!permiso.granted) {
        setAviso("Sin permiso no podemos buscar la dirección: tocá el mapa para poner el pin.");
        return;
      }
      const [resultado] = await Location.geocodeAsync(direccion);
      if (!resultado) {
        setAviso("No encontramos esa dirección: tocá el mapa para poner el pin.");
        return;
      }
      const nuevo = { lat: resultado.latitude, lng: resultado.longitude };
      onCambiar({ ...ubicacion, ...nuevo });
      setRegion(regionDe(nuevo));
      setAviso("Listo: revisá que el pin quede en la puerta del lugar.");
    } catch {
      setAviso("No pudimos buscar la dirección: tocá el mapa para poner el pin.");
    } finally {
      setBuscando(false);
    }
  };

  if (!HAY_MAPA) {
    return (
      <Seccion>
        <Titulo>Ubicación en el mapa (opcional)</Titulo>
        <Ayuda>Podés marcar el punto exacto desde la app en el celular.</Ayuda>
      </Seccion>
    );
  }

  return (
    <Seccion testID="selector-ubicacion">
      <Titulo accessibilityRole="header">Ubicación en el mapa (opcional)</Titulo>
      <Ayuda>Así tus compradores pueden abrir la ruta en Google Maps.</Ayuda>
      <Input
        label="Dirección exacta"
        value={ubicacion.direccion}
        onChangeText={(direccion) => onCambiar({ ...ubicacion, direccion })}
        placeholder="Ej.: Defensa 1200, San Telmo, CABA"
        icono={MapPin}
        error={error}
        maxLength={200}
        testID="ubicacion-direccion"
      />
      <Fila>
        <Button
          variant="outline"
          size="sm"
          icono={Search}
          onPress={buscar}
          loading={buscando}
          testID="ubicacion-buscar"
        >
          Buscar en el mapa
        </Button>
        {punto ? (
          <Button
            variant="ghost"
            size="sm"
            icono={X}
            onPress={() => {
              onCambiar({ ...ubicacion, lat: null, lng: null });
              setAviso(null);
            }}
            testID="ubicacion-quitar"
          >
            Quitar ubicación
          </Button>
        ) : null}
      </Fila>
      <MapaInteractivo
        punto={punto}
        region={region}
        onCambiarPunto={(nuevo) => onCambiar({ ...ubicacion, ...nuevo })}
      />
      {aviso ? (
        <Ayuda accessibilityLiveRegion="polite" testID="ubicacion-aviso">
          {aviso}
        </Ayuda>
      ) : null}
    </Seccion>
  );
}

const Seccion = styled.View`
  gap: 10px;
`;

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Ayuda = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Fila = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

export default SelectorUbicacion;
