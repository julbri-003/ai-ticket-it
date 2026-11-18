import { useEffect, useState } from "react";
import styled from "styled-components/native";
import { ArrowLeft, ArrowRight, Send } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { CampoFechaHora } from "../../components/organizador/CampoFechaHora";
import { EditorTiposEntrada, tipoVacio } from "../../components/organizador/EditorTiposEntrada";
import { BarraOcupacion } from "../../components/organizador/BarraOcupacion";
import { erroresAlt, SelectorMultimedia } from "../../components/organizador/SelectorMultimedia";
import { SelectorUbicacion, ubicacionVacia } from "../../components/organizador/SelectorUbicacion";
import { MapaEstatico } from "../../components/mapa/Mapa";
import {
  Button,
  Card,
  Chip,
  EtiquetaSeccion,
  Input,
  LeyendaObligatorio,
  ModalConfirmacion,
  Select,
  Textarea,
  TituloEscena,
} from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import { eventosService } from "../../service/eventosService";
import {
  agregarIdea,
  ejemploNombre,
  ideaUsada,
  ideasDescripcion,
  tiposSugeridos,
} from "../../service/sugerenciasService";
import {
  organizadorService,
  ubicacionParaEnviar,
  validarDatosEvento,
  validarTiposEntrada,
} from "../../service/organizadorService";
import { fechaLargaTexto, horaTexto } from "../../utils/fechas";
import { montoTexto } from "../../utils/montos";

export const PASOS = ["Datos", "Entradas", "Multimedia", "Revisión"];

const DATOS_INICIALES = {
  nombre: "",
  categoriaId: null,
  fecha: null,
  lugar: "",
  descripcion: "",
  ubicacion: ubicacionVacia(),
};

/** "Ideas para tu descripción" (spec 11): cada chip agrega una línea con su rótulo. */
function IdeasDescripcion({ categoria, descripcion, onCambiar }) {
  const [aviso, setAviso] = useState(null);
  return (
    <Ideas accessibilityLabel="Ideas para tu descripción" testID="ideas-descripcion">
      <TituloIdeas>Ideas para tu descripción</TituloIdeas>
      <FilaChips>
        {ideasDescripcion(categoria).map((idea) => {
          const usada = ideaUsada(descripcion, idea);
          return (
            <Chip
              key={idea}
              etiqueta={idea}
              seleccionado={usada}
              accessibilityLabel={
                usada ? `${idea}, ya agregada` : `Agregar a la descripción: ${idea}`
              }
              testID={`idea-${idea}`}
              onPress={() => {
                const resultado = agregarIdea(descripcion, idea);
                if (resultado.agregada) {
                  onCambiar(resultado.descripcion);
                  setAviso(null);
                } else if (resultado.motivo === "maximo") {
                  setAviso("La descripción ya llegó al máximo de caracteres.");
                }
              }}
            />
          );
        })}
      </FilaChips>
      {aviso ? <AvisoIdeas accessibilityLiveRegion="polite">{aviso}</AvisoIdeas> : null}
    </Ideas>
  );
}

/** Tipos de entrada sugeridos: completan el nombre del primer tipo vacío o agregan uno nuevo. */
function TiposSugeridos({ categoria, tipos, onCambiar }) {
  const usados = new Set(tipos.map((t) => t.nombre.trim().toLowerCase()));
  const disponibles = tiposSugeridos(categoria).filter((n) => !usados.has(n.toLowerCase()));
  if (disponibles.length === 0) return null;
  const usar = (nombre) => {
    const vacio = tipos.findIndex((t) => !t.nombre.trim());
    onCambiar(
      vacio >= 0
        ? tipos.map((t, i) => (i === vacio ? { ...t, nombre } : t))
        : [...tipos, { ...tipoVacio(), nombre }],
    );
  };
  return (
    <Ideas accessibilityLabel="Tipos de entrada sugeridos" testID="tipos-sugeridos">
      <TituloIdeas>Tipos de entrada sugeridos</TituloIdeas>
      <FilaChips>
        {disponibles.map((nombre) => (
          <Chip
            key={nombre}
            etiqueta={nombre}
            accessibilityLabel={`Usar tipo de entrada ${nombre}`}
            testID={`tipo-sugerido-${nombre}`}
            onPress={() => usar(nombre)}
          />
        ))}
      </FilaChips>
    </Ideas>
  );
}

/** Indicador de pasos (1 de 4…). */
function Pasos({ actual }) {
  return (
    <FilaPasos
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${actual + 1} de ${PASOS.length}: ${PASOS[actual]}`}
    >
      {PASOS.map((nombre, i) => (
        <Paso key={nombre}>
          <Marca $activo={i <= actual} />
          <TextoPaso $activo={i === actual}>{nombre}</TextoPaso>
        </Paso>
      ))}
    </FilaPasos>
  );
}

/**
 * Crear evento en 4 pasos con validación inline: datos, tipos de entrada, multimedia (con texto
 * alternativo) y revisión. Publicar crea el evento y después sube la multimedia con progreso.
 */
export function CrearEvento({ navigation }) {
  const toast = useToast();
  const [paso, setPaso] = useState(0);
  const [datos, setDatos] = useState(DATOS_INICIALES);
  const [tipos, setTipos] = useState([tipoVacio()]);
  const [archivos, setArchivos] = useState([]);
  const [errores, setErrores] = useState({});
  const [categorias, setCategorias] = useState([]);
  const [confirmando, setConfirmando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [progreso, setProgreso] = useState(null);

  useEffect(() => {
    eventosService
      .categorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const cambiar = (campo) => (valor) => setDatos((d) => ({ ...d, [campo]: valor }));
  const categoria = categorias.find((c) => c.id === datos.categoriaId);
  const ubicacionFinal = ubicacionParaEnviar(datos.ubicacion, datos.lugar);

  const validarPaso = (n) => {
    if (n === 0) return validarDatosEvento(datos);
    if (n === 1) {
      const resultado = validarTiposEntrada(tipos);
      return resultado.hayErrores ? { tipos: resultado } : {};
    }
    if (n === 2) {
      const alts = erroresAlt(archivos);
      return Object.keys(alts).length ? { alts } : {};
    }
    return {};
  };

  const siguiente = () => {
    const encontrados = validarPaso(paso);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) {
      toast.warning("Revisá los campos marcados antes de seguir.", "Faltan datos");
      return;
    }
    setPaso((p) => Math.min(p + 1, PASOS.length - 1));
  };

  const reiniciar = () => {
    setDatos(DATOS_INICIALES);
    setTipos([tipoVacio()]);
    setArchivos([]);
    setErrores({});
    setPaso(0);
    setProgreso(null);
  };

  const publicar = async () => {
    setPublicando(true);
    let evento;
    try {
      evento = await organizadorService.crearEvento({ ...datos, tiposEntrada: tipos });
    } catch (error) {
      toast.error(error.message, "No pudimos publicar el evento");
      setPublicando(false);
      setConfirmando(false);
      return;
    }
    try {
      if (archivos.length) {
        setProgreso(0);
        await organizadorService.subirMultimedia(evento.id, archivos, setProgreso);
      }
      toast.success(`"${evento.nombre}" ya está publicado.`, "Evento publicado");
      reiniciar();
      navigation.navigate("MisEventos");
    } catch (error) {
      toast.warning(
        `El evento se creó, pero no pudimos subir las imágenes o videos (${error.message}). Probá de nuevo desde Editar.`,
        "Falta la multimedia",
      );
      reiniciar();
      navigation.navigate("EditarEvento", { eventoId: evento.id });
    } finally {
      setPublicando(false);
      setConfirmando(false);
    }
  };

  return (
    <Pantalla>
      <EtiquetaSeccion>Nuevo evento</EtiquetaSeccion>
      <TituloEscena texto="Publicá tu función" destacada="función" />
      <Pasos actual={paso} />

      {paso === 0 ? (
        <Formulario>
          <LeyendaObligatorio />
          <Input
            label="Nombre del evento"
            requerido
            value={datos.nombre}
            onChangeText={cambiar("nombre")}
            error={errores.nombre}
            placeholder={ejemploNombre(categoria?.nombre)}
            testID="evento-nombre"
          />
          <Select
            label="Categoría"
            requerido
            opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={datos.categoriaId}
            onCambiar={cambiar("categoriaId")}
            error={errores.categoriaId}
          />
          <CampoFechaHora
            requerido
            valor={datos.fecha}
            onCambiar={cambiar("fecha")}
            error={errores.fecha}
          />
          <Input
            label="Lugar"
            requerido
            value={datos.lugar}
            onChangeText={cambiar("lugar")}
            error={errores.lugar}
            placeholder="Sala, dirección y ciudad"
            testID="evento-lugar"
          />
          <SelectorUbicacion
            valor={datos.ubicacion}
            onCambiar={cambiar("ubicacion")}
            error={errores.ubicacion}
          />
          <Textarea
            label="Descripción"
            requerido
            value={datos.descripcion}
            onChangeText={cambiar("descripcion")}
            error={errores.descripcion}
            maxLength={5000}
            ayuda="Después de publicar no se puede editar: solo agregar actualizaciones."
            testID="evento-descripcion"
          />
          <IdeasDescripcion
            categoria={categoria?.nombre}
            descripcion={datos.descripcion}
            onCambiar={cambiar("descripcion")}
          />
        </Formulario>
      ) : null}

      {paso === 1 ? (
        <Formulario>
          <TiposSugeridos categoria={categoria?.nombre} tipos={tipos} onCambiar={setTipos} />
          <EditorTiposEntrada tipos={tipos} errores={errores.tipos} onCambiar={setTipos} />
        </Formulario>
      ) : null}

      {paso === 2 ? (
        <SelectorMultimedia archivos={archivos} onCambiar={setArchivos} errores={errores.alts} />
      ) : null}

      {paso === 3 ? (
        <Card>
          <EtiquetaSeccion>Revisión</EtiquetaSeccion>
          <Resumen>{datos.nombre}</Resumen>
          <Detalle>
            {categoria?.nombre} ·{" "}
            {datos.fecha ? `${fechaLargaTexto(datos.fecha)} · ${horaTexto(datos.fecha)} h` : ""}
          </Detalle>
          <Detalle>{datos.lugar}</Detalle>
          {ubicacionFinal ? (
            <>
              <Detalle testID="revision-direccion">Dirección: {ubicacionFinal.direccion}</Detalle>
              <MapaEstatico ubicacion={ubicacionFinal} alto={120} testID="revision-mapa" />
            </>
          ) : null}
          {tipos.map((t) => (
            <Detalle key={t.clave}>
              {t.nombre} · {montoTexto(Number(String(t.precio).replace(",", ".")))} · cupo {t.cupo}
            </Detalle>
          ))}
          <Detalle>
            {archivos.length} {archivos.length === 1 ? "archivo" : "archivos"} de multimedia
          </Detalle>
          {progreso != null ? (
            <BarraOcupacion
              vendidas={Math.round(progreso * 100)}
              cupo={100}
              etiqueta="Subiendo multimedia"
            />
          ) : null}
        </Card>
      ) : null}

      <Navegacion>
        {paso > 0 ? (
          <Button
            variant="outline"
            icono={ArrowLeft}
            onPress={() => setPaso((p) => p - 1)}
            disabled={publicando}
          >
            Anterior
          </Button>
        ) : (
          <Vacio />
        )}
        {paso < PASOS.length - 1 ? (
          <Button iconoDerecha={ArrowRight} onPress={siguiente} testID="paso-siguiente">
            Siguiente
          </Button>
        ) : (
          <Button
            icono={Send}
            onPress={() => setConfirmando(true)}
            loading={publicando}
            testID="publicar"
          >
            Publicar
          </Button>
        )}
      </Navegacion>

      <ModalConfirmacion
        visible={confirmando}
        titulo="¿Publicar el evento?"
        mensaje="Después de publicar no vas a poder editar la descripción original ni borrar o modificar los tipos de entrada. Sí vas a poder agregar tipos nuevos, actualizaciones y multimedia."
        textoConfirmar="Publicar"
        cargando={publicando}
        alConfirmar={publicar}
        alCancelar={() => setConfirmando(false)}
      />
    </Pantalla>
  );
}

const FilaPasos = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const Paso = styled.View`
  flex: 1;
  gap: 6px;
`;

const Marca = styled.View`
  height: 4px;
  border-radius: 2px;
  background-color: ${({ theme, $activo }) =>
    $activo ? theme.colors.primary : theme.colors.divider};
`;

const TextoPaso = styled.Text`
  font-family: ${({ theme, $activo }) =>
    $activo ? theme.typography.fontBodySemibold : theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme, $activo }) =>
    $activo ? theme.colors.accentText : theme.colors.textSecondary};
`;

const Formulario = styled.View`
  gap: 16px;
`;

const Resumen = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Detalle = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Navegacion = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
`;

const Vacio = styled.View``;

const Ideas = styled.View`
  gap: 8px;
`;

const TituloIdeas = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaChips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const AvisoIdeas = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.warning};
`;

export default CrearEvento;
