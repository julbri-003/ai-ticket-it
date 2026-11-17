import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import styled, { useTheme } from "styled-components/native";
import { ImagePlus, PlayCircle, X } from "lucide-react-native";
import { Button, Input } from "../ui";
import { useToast } from "../../context/ToastContext";
import { MAX_ARCHIVOS, validarAlt, validarArchivo } from "../../service/organizadorService";

/** Asset del picker → archivo de la app ({ uri, nombre, mimeType, tamanio, tipo, alt }). */
export function aArchivo(asset) {
  const tipo = asset.type === "video" ? "video" : "imagen";
  const extension = tipo === "video" ? "mp4" : (asset.mimeType?.split("/")[1] ?? "jpg");
  return {
    clave: asset.assetId ?? asset.uri,
    uri: asset.uri,
    nombre: asset.fileName ?? `${tipo}-${Date.now()}.${extension}`,
    mimeType: asset.mimeType ?? (tipo === "video" ? "video/mp4" : "image/jpeg"),
    tamanio: asset.fileSize ?? null,
    tipo,
    alt: "",
  };
}

/**
 * Elegir imágenes y videos (múltiple) con previsualización, quitar, validación de tipo y tamaño
 * en el cliente y texto alternativo obligatorio para cada archivo.
 */
export function SelectorMultimedia({ archivos, onCambiar, errores = {}, maximo = MAX_ARCHIVOS }) {
  const theme = useTheme();
  const toast = useToast();
  const restantes = maximo - archivos.length;

  const elegir = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      toast.warning("Necesitamos permiso para acceder a tus fotos y videos.", "Sin permiso");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: restantes,
      quality: 0.8,
    });
    if (resultado.canceled) return;
    const nuevos = [];
    const rechazados = [];
    for (const asset of resultado.assets) {
      const archivo = aArchivo(asset);
      const error = validarArchivo(archivo);
      if (error) rechazados.push(`${archivo.nombre}: ${error}`);
      else nuevos.push(archivo);
    }
    if (rechazados.length) toast.error(rechazados.join("\n"), "Algunos archivos no se agregaron");
    if (nuevos.length) onCambiar([...archivos, ...nuevos].slice(0, maximo));
  };

  const actualizarAlt = (clave, alt) =>
    onCambiar(archivos.map((a) => (a.clave === clave ? { ...a, alt } : a)));
  const quitar = (clave) => onCambiar(archivos.filter((a) => a.clave !== clave));

  return (
    <Contenedor>
      {archivos.map((archivo, i) => (
        <Item key={archivo.clave} testID={`archivo-${i}`}>
          <Vista>
            {archivo.tipo === "imagen" ? (
              <Image
                source={{ uri: archivo.uri }}
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
                accessible={false}
              />
            ) : (
              <PlayCircle size={36} color={theme.colors.textSecondary} accessible={false} />
            )}
            <Quitar
              onPress={() => quitar(archivo.clave)}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${archivo.nombre}`}
            >
              <X size={16} color="#ffffff" accessible={false} />
            </Quitar>
          </Vista>
          <Input
            label={archivo.tipo === "video" ? "Descripción del video" : "Descripción de la imagen"}
            requerido
            value={archivo.alt}
            onChangeText={(alt) => actualizarAlt(archivo.clave, alt)}
            error={errores[archivo.clave] ?? undefined}
            ayuda="Texto alternativo para lectores de pantalla: qué se ve."
            maxLength={300}
            testID={`alt-${i}`}
          />
        </Item>
      ))}
      <Button
        variant="outline"
        icono={ImagePlus}
        onPress={elegir}
        disabled={restantes <= 0}
        testID="elegir-multimedia"
      >
        {restantes > 0
          ? `Agregar fotos o videos (quedan ${restantes})`
          : `Máximo ${maximo} archivos`}
      </Button>
      <Ayuda>Imágenes JPG, PNG o WEBP de hasta 5 MB · Videos MP4 de hasta 20 MB.</Ayuda>
    </Contenedor>
  );
}

/** Errores de texto alternativo por archivo: { [clave]: mensaje }. */
export function erroresAlt(archivos) {
  return Object.fromEntries(archivos.map((a) => [a.clave, validarAlt(a)]).filter(([, e]) => e));
}

const Contenedor = styled.View`
  gap: 16px;
`;

const Item = styled.View`
  gap: 8px;
`;

const Vista = styled.View`
  height: 160px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const Quitar = styled.Pressable`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 44px;
  height: 44px;
  border-radius: 22px;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
`;

const Ayuda = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default SelectorMultimedia;
