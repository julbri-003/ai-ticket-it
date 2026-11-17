import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { CalendarDays, MapPin, PlayCircle, ShoppingCart } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { BotonFavorito } from "../../components/eventos/TarjetaEvento";
import { SelectorCantidad, MAX_POR_COMPRA } from "../../components/compras/SelectorCantidad";
import {
  Badge,
  Button,
  Card,
  Carrusel,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  ImagenEvento,
  ModalConfirmacion,
  Paginacion,
  Rating,
  SkeletonDetalle,
  TextoTalon,
  TicketCard,
  TituloEscena,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFavorito } from "../../hooks/useFavorito";
import { comprasService } from "../../service/comprasService";
import { eventosService } from "../../service/eventosService";
import { montoTexto } from "../../utils/montos";

const LIMITE_RESENIAS = 5;

/**
 * Resumen de lo que se reserva: evento, tipo, cantidad, precio unitario y total. Reservar
 * implica un compromiso de pago (aunque después se pueda cancelar), por eso se confirma.
 */
export function mensajeReserva({ evento, tipo, cantidad }) {
  const entradas = cantidad === 1 ? "1 entrada" : `${cantidad} entradas`;
  return (
    `Vas a reservar ${entradas} ${tipo.nombre} para «${evento.nombre}» (${evento.fechaLargaTexto}) ` +
    `a ${montoTexto(tipo.precio)} cada una.\n\nTotal: ${montoTexto(tipo.precio * cantidad)}.\n\n` +
    "Al reservar te comprometés a pagar dentro de las 48 h. Si no pagás, la reserva vence y las entradas se liberan."
  );
}

function TipoEntrada({ tipo, seleccionado, onPress, deshabilitado }) {
  return (
    <OpcionTipo
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="radio"
      accessibilityLabel={`${tipo.nombre}, ${tipo.precioTexto}, ${tipo.quedanTexto}`}
      accessibilityState={{
        checked: seleccionado,
        selected: seleccionado,
        disabled: deshabilitado,
      }}
      $seleccionado={seleccionado}
      $deshabilitado={deshabilitado}
      testID={`tipo-${tipo.id}`}
    >
      <TextosTipo>
        <NombreTipo>{tipo.nombre}</NombreTipo>
        {tipo.descripcion ? <Secundario>{tipo.descripcion}</Secundario> : null}
        <Badge variant={tipo.agotado ? "error" : tipo.disponibles <= 20 ? "warning" : "success"}>
          {tipo.quedanTexto}
        </Badge>
      </TextosTipo>
      <Precio>{tipo.precioTexto}</Precio>
    </OpcionTipo>
  );
}

/** Reseñas del organizador (caso de uso 10), paginadas. */
function ReseniasOrganizador({ eventoId }) {
  const [pagina, setPagina] = useState(1);
  const [estado, setEstado] = useState({ cargando: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((e) => ({ ...e, cargando: true }));
    eventosService
      .resenias(eventoId, { pagina, limite: LIMITE_RESENIAS })
      .then((datos) => vigente && setEstado({ cargando: false, datos }))
      .catch((error) => vigente && setEstado({ cargando: false, error }));
    return () => {
      vigente = false;
    };
  }, [eventoId, pagina, version]);

  if (estado.error)
    return (
      <ErrorState
        titulo="No pudimos cargar las reseñas"
        alReintentar={() => setVersion((v) => v + 1)}
      />
    );
  if (!estado.datos) return null;
  if (estado.datos.total === 0) {
    return (
      <EmptyState
        titulo="Sin reseñas todavía"
        mensaje="Este organizador todavía no recibió reseñas."
      />
    );
  }
  return (
    <ListaResenias>
      {estado.datos.items.map((r) => (
        <Card key={r.id}>
          <Rating valor={r.puntuacion} />
          {r.detalle ? <Comentario>“{r.detalle}”</Comentario> : null}
          <Secundario>
            {r.autor} · {r.tipoEntrada} · {r.evento} · {r.fechaTexto}
          </Secundario>
        </Card>
      ))}
      <Paginacion
        pagina={estado.datos.pagina}
        total={estado.datos.total}
        limite={estado.datos.limite}
        onCambiar={setPagina}
      />
    </ListaResenias>
  );
}

/** Detalle del evento: multimedia, datos, organizador, tipos de entrada, cantidad y compra. */
export function DetalleEvento({ route, navigation }) {
  const theme = useTheme();
  const { eventoId } = route.params;
  const { usuario, esComprador } = useAuth();
  const toast = useToast();
  const favoritos = useFavorito();
  const [estado, setEstado] = useState({ cargando: true });
  const [tipoId, setTipoId] = useState(null);
  const [cantidad, setCantidad] = useState(1);
  const [comprando, setComprando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const evento = await eventosService.detalle(eventoId);
      setEstado({ cargando: false, evento });
      navigation.setOptions({ title: evento.nombre });
    } catch (error) {
      setEstado({ cargando: false, error });
    }
  }, [eventoId, navigation]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const { evento } = estado;
  const tipo = evento?.tiposEntrada.find((t) => t.id === tipoId) ?? null;
  const maximo = tipo ? Math.min(tipo.disponibles, MAX_POR_COMPRA) : MAX_POR_COMPRA;

  // Si cambia el tipo (o su cupo), la cantidad nunca supera lo disponible.
  useEffect(() => {
    if (tipo && cantidad > maximo) setCantidad(Math.max(1, maximo));
  }, [tipo, cantidad, maximo]);

  if (estado.cargando && !evento) {
    return (
      <Pantalla>
        <SkeletonDetalle />
      </Pantalla>
    );
  }
  if (estado.error) {
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

  const comprar = async () => {
    setComprando(true);
    try {
      const compra = await comprasService.crear(
        { eventoId: evento.id, tipoEntradaId: tipo.id, cantidad },
        usuario.id,
      );
      toast.success(
        `Reservaste ${cantidad} × ${tipo.nombre}. Tenés hasta el ${compra.fechaLimitePagoTexto} para pagar.`,
        "Entradas reservadas",
      );
      setConfirmando(false);
      cargar();
      navigation.navigate("Checkout", { compraId: compra.id });
    } catch (error) {
      setConfirmando(false);
      toast.error(error.message, "No pudimos reservar tus entradas");
      cargar();
    } finally {
      setComprando(false);
    }
  };

  const anterior = evento.anterior;

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando}>
      <Atenuado $anterior={anterior}>
        {evento.imagenes.length > 1 ? (
          <Carrusel
            items={evento.imagenes.map((img, i) => ({ ...img, id: `${img.uri}-${i}` }))}
            etiqueta="Imágenes del evento"
            visor={evento.imagenes}
            renderItem={(img) => <ImagenEvento uri={img.uri} alt={img.alt} />}
          />
        ) : (
          <ImagenEvento
            uri={evento.imagen?.uri}
            alt={evento.imagen?.alt ?? `Imagen de ${evento.nombre}`}
          />
        )}
      </Atenuado>
      {evento.videos.map((video) => (
        <Button
          key={video.uri}
          variant="outline"
          icono={PlayCircle}
          onPress={() => Linking.openURL(video.uri)}
          accessibilityHint={video.alt}
        >
          Ver video
        </Button>
      ))}

      <Cabecera>
        <Badge variant={anterior ? "neutral" : "primary"}>
          {anterior ? "Finalizado" : evento.categoria.nombre}
        </Badge>
        {esComprador ? (
          <BotonFavorito
            activo={favoritos.esFavorito(evento)}
            onPress={() => favoritos.alternar(evento)}
            nombre={evento.nombre}
          />
        ) : null}
      </Cabecera>
      <TituloEscena texto={evento.nombre} />
      <Fila>
        <CalendarDays size={18} color={theme.colors.textSecondary} accessible={false} />
        <Dato>{evento.fechaLargaTexto}</Dato>
      </Fila>
      <Fila>
        <MapPin size={18} color={theme.colors.textSecondary} accessible={false} />
        <Dato>{evento.lugar}</Dato>
      </Fila>

      <Seccion>
        <EtiquetaSeccion>Sobre el evento</EtiquetaSeccion>
        <Parrafo>{evento.descripcion}</Parrafo>
        {evento.ampliaciones.map((a) => (
          <Ampliacion key={`${a.fechaTexto}-${a.texto}`}>
            <Meta>{a.fechaTexto}</Meta>
            <Parrafo>{a.texto}</Parrafo>
          </Ampliacion>
        ))}
      </Seccion>

      <Card>
        <EtiquetaSeccion>Organiza</EtiquetaSeccion>
        <NombreTipo>{evento.organizador.nombre}</NombreTipo>
        <Rating valor={evento.organizador.puntaje} cantidad={evento.organizador.cantidadResenias} />
      </Card>

      {anterior ? (
        <EmptyState
          titulo="Este evento ya ocurrió"
          mensaje="Ya no se pueden comprar entradas. Podés ver las reseñas del organizador más abajo."
        />
      ) : (
        <TicketCard
          talon={
            <FilaTalon>
              <TextoTalon>Total</TextoTalon>
              <TextoTalon testID="total-compra">
                {tipo ? montoTexto(tipo.precio * cantidad) : "—"}
              </TextoTalon>
            </FilaTalon>
          }
        >
          <EtiquetaSeccion>Elegí tus entradas</EtiquetaSeccion>
          <Grupo accessibilityRole="radiogroup" accessibilityLabel="Tipos de entrada">
            {evento.tiposEntrada.map((t) => (
              <TipoEntrada
                key={t.id}
                tipo={t}
                seleccionado={t.id === tipoId}
                deshabilitado={t.agotado}
                onPress={() => {
                  setTipoId(t.id);
                  setCantidad(1);
                }}
              />
            ))}
          </Grupo>
          {tipo ? (
            <SelectorCantidad valor={cantidad} maximo={maximo} onCambiar={setCantidad} />
          ) : null}
          {esComprador ? (
            <Button
              icono={ShoppingCart}
              onPress={() => setConfirmando(true)}
              loading={comprando}
              disabled={!tipo || maximo < 1}
              bloque
              testID="boton-comprar"
            >
              {tipo
                ? `Comprar · ${montoTexto(tipo.precio * cantidad)}`
                : "Elegí un tipo de entrada"}
            </Button>
          ) : null}
        </TicketCard>
      )}

      <Seccion>
        <EtiquetaSeccion>Reseñas del organizador</EtiquetaSeccion>
        <ReseniasOrganizador eventoId={evento.id} />
      </Seccion>

      {tipo ? (
        <ModalConfirmacion
          visible={confirmando}
          titulo="Confirmar reserva"
          mensaje={mensajeReserva({ evento, tipo, cantidad })}
          textoConfirmar="Reservar"
          textoCancelar="Volver"
          cargando={comprando}
          alConfirmar={comprar}
          alCancelar={() => setConfirmando(false)}
        />
      ) : null}
    </Pantalla>
  );
}

const Atenuado = styled.View`
  opacity: ${({ $anterior }) => ($anterior ? 0.6 : 1)};
`;

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Fila = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 10px;
`;

const Dato = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Seccion = styled.View`
  gap: 10px;
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

const Grupo = styled.View`
  gap: 10px;
`;

const OpcionTipo = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  border-width: ${({ $seleccionado }) => ($seleccionado ? 2 : 1)}px;
  border-color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.accentText : theme.colors.divider};
  background-color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.surfaceSubtle : theme.colors.surface};
  opacity: ${({ $deshabilitado }) => ($deshabilitado ? 0.5 : 1)};
`;

const TextosTipo = styled.View`
  flex: 1;
  gap: 4px;
`;

const NombreTipo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Precio = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Secundario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

const ListaResenias = styled.View`
  gap: 12px;
`;

const Comentario = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default DetalleEvento;
