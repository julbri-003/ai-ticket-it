// Mapas (spec 11): ruta a un evento en Google Maps.

/** Centro por defecto del mapa del organizador: el Obelisco (CABA). */
export const CENTRO_POR_DEFECTO = { lat: -34.6037, lng: -58.3816 };

/**
 * URL de Google Maps con la ruta en auto hasta el evento. Sin `origin`, Google Maps arranca
 * desde la ubicación actual del dispositivo, así que la app no necesita leerla. Con coordenadas
 * usa el punto exacto; si no, el texto del lugar.
 */
export function urlComoLlegar(evento) {
  const { ubicacion, lugar } = evento ?? {};
  const destino = ubicacion
    ? `${ubicacion.lat},${ubicacion.lng}`
    : encodeURIComponent((lugar ?? "").trim());
  if (!destino) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`;
}

/** Región de react-native-maps alrededor de un punto (zoom de barrio). */
export const regionDe = ({ lat, lng }, delta = 0.01) => ({
  latitude: lat,
  longitude: lng,
  latitudeDelta: delta,
  longitudeDelta: delta,
});
