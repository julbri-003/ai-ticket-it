import { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import styled, { useTheme } from "styled-components/native";
import { Ban, Lock, PlayCircle, Plus, Trash2, Upload } from "lucide-react-native";
import { ModalCancelarEvento } from "../../components/organizador/ModalCancelarEvento";
import { Pantalla } from "../../components/layout/Pantalla";
import { BarraOcupacion } from "../../components/organizador/BarraOcupacion";
import { ModalTipoEntrada } from "../../components/organizador/ModalTipoEntrada";
import { erroresAlt, SelectorMultimedia } from "../../components/organizador/SelectorMultimedia";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  EventoCanceladoBadge,
  ModalConfirmacion,
  SkeletonDetalle,
  Textarea,
  TituloEscena,
} from "../../components/ui";
import { MapaEstatico } from "../../components/mapa/Mapa";
import { useToast } from "../../context/ToastContext";
import { organizadorService } from "../../service/organizadorService";

function CampoNoEditable({ etiqueta, valor }) {
  const theme = useTheme();
  return (
    <FilaNoEditable accessible accessibilityLabel={`${etiqueta}: ${valor}. No editable`}>
      <TextosNoEditable>
        <EtiquetaCampo>{etiqueta}</EtiquetaCampo>
        <ValorCampo>{valor}</ValorCampo>
      </TextosNoEditable>
      <Nota>
        <Lock size={14} color={theme.colors.textMuted} accessible={false} />
        <TextoNota>No editable</TextoNota>
      </Nota>
    </FilaNoEditable>
  );
}

/**
 * Edición restringida: multimedia (agregar y quitar), tipos de entrada (solo agregar; los
 * existentes en solo lectura), actualizaciones de la descripción y el resto no editable.
 * Si el evento ya ocurrió, todo queda en solo lectura.
 */
export function EditarEvento({ route }) {
  const theme = useTheme();
  const { eventoId } = route.params;
  const toast = useToast();
  const [estado, setEstado] = useState({ cargando: true });
  const [nuevos, setNuevos] = useState([]);
  const [erroresNuevos, setErroresNuevos] = useState({});
  const [progreso, setProgreso] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aQuitar, setAQuitar] = useState(null);
  const [quitando, setQuitando] = useState(false);
  const [modalTipo, setModalTipo] = useState(false);
  const [actualizacion, setActualizacion] = useState("");
  const [errorActualizacion, setErrorActualizacion] = useState(null);
  const [publicando, setPublicando] = useState(false);
  const [cancelandoEvento, setCancelandoEvento] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({ cargando: false, evento: await organizadorService.eventoParaEditar(eventoId) });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [eventoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const { evento } = estado;
  if (estado.cargando && !evento) {
    return (
      <Pantalla>
        <SkeletonDetalle />
      </Pantalla>
    );
  }
  if (estado.error && !evento) {
    return (
      <Pantalla>
        <ErrorState
          titulo="No pudimos cargar el evento"
          mensaje={estado.error.message}
          alReintentar={cargar}
        />
      </Pantalla>
    );
  }

  const soloLectura = evento.anterior || evento.cancelado;

  const subir = async () => {
    const errores = erroresAlt(nuevos);
    setErroresNuevos(errores);
    if (Object.keys(errores).length) return;
    setSubiendo(true);
    setProgreso(0);
    try {
      await organizadorService.subirMultimedia(evento.id, nuevos, setProgreso);
      toast.success(
        `Subiste ${nuevos.length} ${nuevos.length === 1 ? "archivo" : "archivos"}.`,
        "Multimedia actualizada",
      );
      setNuevos([]);
      cargar();
    } catch (error) {
      toast.error(error.message, "No pudimos subir la multimedia");
    } finally {
      setSubiendo(false);
      setProgreso(null);
    }
  };

  const quitarMultimedia = async () => {
    setQuitando(true);
    try {
      await organizadorService.quitarMultimedia(evento.id, aQuitar.ruta);
      toast.success("Quitaste el archivo del evento.", "Multimedia actualizada");
      cargar();
    } catch (error) {
      toast.error(error.message, "No pudimos quitar el archivo");
    } finally {
      setQuitando(false);
      setAQuitar(null);
    }
  };

  const publicarActualizacion = async () => {
    if (!actualizacion.trim()) {
      setErrorActualizacion("Escribí la actualización.");
      return;
    }
    setPublicando(true);
    try {
      await organizadorService.ampliar(evento.id, actualizacion);
      toast.success("Los compradores ya ven la actualización.", "Actualización publicada");
      setActualizacion("");
      setErrorActualizacion(null);
      cargar();
    } catch (error) {
      toast.error(error.message, "No pudimos publicar la actualización");
    } finally {
      setPublicando(false);
    }
  };

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando}>
      <EtiquetaSeccion>Editar evento</EtiquetaSeccion>
      <TituloEscena texto={evento.nombre} />
      {evento.cancelado ? <EventoCanceladoBadge /> : null}
      {soloLectura ? (
        <Aviso accessibilityRole="alert" testID="aviso-solo-lectura">
          <Lock size={16} color={theme.colors.textSecondary} accessible={false} />
          <TextoAviso>
            {evento.cancelado
              ? `Evento cancelado. Motivo: ${evento.motivoCancelacion}`
              : "Este evento ya ocurrió: todo queda en solo lectura."}
          </TextoAviso>
        </Aviso>
      ) : null}

      <Card>
        <EtiquetaSeccion>Datos del evento</EtiquetaSeccion>
        <CampoNoEditable etiqueta="Nombre" valor={evento.nombre} />
        <CampoNoEditable etiqueta="Categoría" valor={evento.categoria.nombre} />
        <CampoNoEditable etiqueta="Fecha y hora" valor={evento.fechaLargaTexto} />
        <CampoNoEditable etiqueta="Lugar" valor={evento.lugar} />
        {evento.ubicacion ? (
          <>
            <CampoNoEditable etiqueta="Ubicación en el mapa" valor={evento.ubicacion.direccion} />
            <MapaEstatico ubicacion={evento.ubicacion} alto={120} testID="mapa-editar" />
          </>
        ) : null}
      </Card>

      <Seccion>
        <EtiquetaSeccion>Multimedia</EtiquetaSeccion>
        {evento.multimedia.length === 0 ? (
          <Secundario>Todavía no hay imágenes ni videos.</Secundario>
        ) : null}
        <Grilla>
          {evento.multimedia.map((m) => (
            <Celda key={m.ruta}>
              <Vista accessible accessibilityRole="image" accessibilityLabel={m.alt}>
                {m.tipo === "imagen" ? (
                  <Image
                    source={{ uri: m.uri }}
                    contentFit="cover"
                    style={{ width: "100%", height: "100%" }}
                    accessible={false}
                  />
                ) : (
                  <PlayCircle size={32} color={theme.colors.textSecondary} accessible={false} />
                )}
              </Vista>
              {!soloLectura ? (
                <Button
                  variant="ghost"
                  size="sm"
                  icono={Trash2}
                  onPress={() => setAQuitar(m)}
                  accessibilityLabel={`Quitar ${m.alt}`}
                >
                  Quitar
                </Button>
              ) : null}
            </Celda>
          ))}
        </Grilla>
        {!soloLectura ? (
          <>
            <SelectorMultimedia
              archivos={nuevos}
              onCambiar={setNuevos}
              errores={erroresNuevos}
              maximo={Math.max(0, 6 - evento.multimedia.length)}
            />
            {progreso != null ? (
              <BarraOcupacion
                vendidas={Math.round(progreso * 100)}
                cupo={100}
                etiqueta="Subiendo"
              />
            ) : null}
            {nuevos.length ? (
              <Button icono={Upload} onPress={subir} loading={subiendo} testID="subir-multimedia">
                {`Subir ${nuevos.length} ${nuevos.length === 1 ? "archivo" : "archivos"}`}
              </Button>
            ) : null}
          </>
        ) : null}
      </Seccion>

      <Seccion>
        <EtiquetaSeccion>Tipos de entrada</EtiquetaSeccion>
        <Secundario>Los tipos publicados no se pueden modificar ni borrar.</Secundario>
        {evento.tiposEntrada.map((t) => (
          <Card key={t.id} testID={`tipo-existente-${t.id}`}>
            <FilaTipo>
              <NombreTipo>{t.nombre}</NombreTipo>
              <NombreTipo>{t.precioTexto}</NombreTipo>
            </FilaTipo>
            {t.descripcion ? <Secundario>{t.descripcion}</Secundario> : null}
            <BarraOcupacion
              vendidas={t.vendidas}
              cupo={t.cupo}
              etiqueta={`Vendidas · quedan ${t.disponibles}`}
            />
          </Card>
        ))}
        {!soloLectura ? (
          <Button
            variant="outline"
            icono={Plus}
            onPress={() => setModalTipo(true)}
            testID="agregar-tipo-entrada"
          >
            Agregar tipo de entrada
          </Button>
        ) : null}
      </Seccion>

      <Seccion>
        <EtiquetaSeccion>Descripción</EtiquetaSeccion>
        <Card>
          <FilaTipo>
            <EtiquetaCampo>Descripción original</EtiquetaCampo>
            <Nota>
              <Lock size={14} color={theme.colors.textMuted} accessible={false} />
              <TextoNota>No editable</TextoNota>
            </Nota>
          </FilaTipo>
          <Parrafo testID="descripcion-original">{evento.descripcion}</Parrafo>
        </Card>
        {evento.ampliaciones.map((a) => (
          <Ampliacion key={`${a.fechaTexto}-${a.texto}`}>
            <Meta>{a.fechaTexto}</Meta>
            <Parrafo>{a.texto}</Parrafo>
          </Ampliacion>
        ))}
        {!soloLectura ? (
          <>
            <Textarea
              label="Agregar actualización"
              value={actualizacion}
              onChangeText={(v) => {
                setActualizacion(v);
                setErrorActualizacion(null);
              }}
              error={errorActualizacion}
              maxLength={2000}
              ayuda="Se publica con la fecha de hoy debajo de la descripción original."
              testID="campo-actualizacion"
            />
            <Button
              onPress={publicarActualizacion}
              loading={publicando}
              testID="publicar-actualizacion"
            >
              Publicar actualización
            </Button>
          </>
        ) : (
          <EmptyState
            titulo="Sin cambios posibles"
            mensaje={
              evento.cancelado
                ? "Los eventos cancelados no se editan."
                : "Los eventos que ya ocurrieron no se editan."
            }
          />
        )}
      </Seccion>

      {!soloLectura ? (
        <Button
          variant="danger"
          icono={Ban}
          onPress={() => setCancelandoEvento(true)}
          testID="cancelar-evento"
        >
          Cancelar evento
        </Button>
      ) : null}

      <ModalCancelarEvento
        visible={cancelandoEvento}
        evento={evento}
        alCerrar={() => setCancelandoEvento(false)}
        alCancelar={cargar}
      />
      <ModalConfirmacion
        visible={Boolean(aQuitar)}
        titulo="¿Quitar este archivo?"
        mensaje={aQuitar ? `Se va a quitar "${aQuitar.alt}" del evento.` : ""}
        textoConfirmar="Quitar"
        peligro
        cargando={quitando}
        alConfirmar={quitarMultimedia}
        alCancelar={() => setAQuitar(null)}
      />
      <ModalTipoEntrada
        visible={modalTipo}
        eventoId={evento.id}
        nombresExistentes={evento.tiposEntrada.map((t) => t.nombre)}
        alCerrar={() => setModalTipo(false)}
        alAgregar={cargar}
      />
    </Pantalla>
  );
}

const Aviso = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoAviso = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaNoEditable = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom-width: 1px;
  border-bottom-color: ${({ theme }) => theme.colors.divider};
`;

const TextosNoEditable = styled.View`
  flex: 1;
  gap: 2px;
`;

const EtiquetaCampo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ValorCampo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Nota = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 4px;
`;

const TextoNota = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Seccion = styled.View`
  gap: 12px;
`;

const Grilla = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
`;

const Celda = styled.View`
  width: 47%;
  gap: 4px;
`;

const Vista = styled.View`
  height: 110px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  overflow: hidden;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const FilaTipo = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`;

const NombreTipo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Secundario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Parrafo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Ampliacion = styled.View`
  gap: 4px;
  padding-left: 12px;
  border-left-width: 3px;
  border-left-color: ${({ theme }) => theme.colors.goldOrnament};
`;

const Meta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.gold};
`;

export default EditarEvento;
