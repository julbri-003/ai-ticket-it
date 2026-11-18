import MapView, { Marker } from "react-native-maps";
import { useTheme } from "styled-components/native";
import { DECORATIVO } from "../ui/Teatro";
import { regionDe } from "../../utils/mapas";

// Mapas nativos (spec 11). En web se usa Mapa.web.jsx, que no dibuja mapa.
export const HAY_MAPA = true;

/**
 * Mapa interactivo del organizador: tocar el mapa o arrastrar el pin cambia el punto.
 * `region` centra el mapa (cuando se busca una dirección).
 */
export function MapaInteractivo({ punto, region, onCambiarPunto, testID = "mapa-organizador" }) {
  const theme = useTheme();
  const mover = (e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    onCambiarPunto({ lat: latitude, lng: longitude });
  };
  return (
    <MapView
      style={{ height: 200, borderRadius: 12 }}
      region={region}
      onPress={mover}
      accessibilityLabel="Mapa: tocá para ubicar el evento o usá la búsqueda por dirección"
      testID={testID}
    >
      {punto ? (
        <Marker
          coordinate={{ latitude: punto.lat, longitude: punto.lng }}
          draggable
          onDragEnd={mover}
          pinColor={theme.colors.primary}
          testID="pin-evento"
        />
      ) : null}
    </MapView>
  );
}

/** Mini mapa no interactivo con el pin (detalle del evento, revisión, editar). Decorativo. */
export function MapaEstatico({ ubicacion, alto = 160, testID = "mapa-evento" }) {
  const theme = useTheme();
  return (
    <MapView
      {...DECORATIVO}
      style={{ height: alto, borderRadius: 12 }}
      region={regionDe(ubicacion, 0.008)}
      liteMode
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      testID={testID}
    >
      <Marker
        coordinate={{ latitude: ubicacion.lat, longitude: ubicacion.lng }}
        pinColor={theme.colors.primary}
      />
    </MapView>
  );
}
