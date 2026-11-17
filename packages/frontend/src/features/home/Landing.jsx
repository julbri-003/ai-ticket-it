import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, useWindowDimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import styled, { useTheme } from "styled-components/native";
import {
  ArrowRight,
  CalendarDays,
  CircleDollarSign,
  Clock,
  MapPin,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react-native";
import { iconoCategoria } from "../../components/eventos/iconosCategoria";
import { Footer } from "../../components/layout/Footer";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Badge,
  Button,
  Card,
  Carrusel,
  ConTelon,
  DECORATIVO,
  ErrorState,
  EtiquetaSeccion,
  Fleco,
  ImagenEvento,
  Marquesina,
  Ornamento,
  PerforacionVertical,
  Rating,
  Reflector,
  Revelar,
  Sello,
  Skeleton,
  SkeletonCard,
  TextoTalon,
  TexturaPliegues,
  TicketCard,
  TituloEscena,
} from "../../components/ui";
import { useContador } from "../../hooks/useContador";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { publicoService } from "../../service/publicoService";
import { SinConexion } from "../errors/PantallaError";

const PASOS = [
  {
    titulo: "Elegí tu función",
    texto: "Buscá por categoría, fecha o precio y guardá tus favoritos.",
  },
  {
    titulo: "Reservá y pagá",
    texto: "Tenés 48 h para pagar; el cupo queda reservado a tu nombre.",
  },
  {
    titulo: "Entrá sin demoras",
    texto: "Tu entrada vive en la app. Si algo cambia, te avisamos al instante.",
  },
];

const GARANTIAS = [
  { icono: ShieldCheck, texto: "Reembolso si se cancela el evento" },
  { icono: Clock, texto: "48 h para pagar tu reserva" },
  { icono: MessageCircle, texto: "Chat directo con el organizador" },
];

const PARA_COMPRADORES = [
  "Recomendados según tus favoritos",
  "Chat directo con el organizador de cada compra",
  "Cancelación con reembolso garantizado en 24 h",
];
const PARA_ORGANIZADORES = [
  "Publicá eventos con varios tipos de entrada",
  "Seguimiento de ventas y ocupación en tiempo real",
  "Reembolsos y reseñas en un solo lugar",
];

const formatoEntero = new Intl.NumberFormat("es-AR");
const formatoPuntaje = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** "12 eventos", "1 evento", "Próximamente" (0) o null si todavía no se sabe. */
export function textoCantidadEventos(cantidad) {
  if (cantidad == null) return null;
  if (cantidad === 0) return "Próximamente";
  return cantidad === 1 ? "1 evento" : `${cantidad} eventos`;
}

/** Iniciales para el avatar de una reseña: "Martín G." → "MG". */
export function iniciales(nombre = "") {
  const partes = nombre
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return ((partes[0]?.[0] ?? "") + (partes.length > 1 ? partes.at(-1)[0] : "")).toUpperCase();
}

function useDatosLanding() {
  const [estado, setEstado] = useState({ cargando: true });

  const cargar = useCallback(async () => {
    setEstado((previo) => ({ ...previo, cargando: true }));
    const [resumen, categorias, eventos] = await Promise.allSettled([
      publicoService.resumen(),
      publicoService.categorias(),
      publicoService.proximosEventos(8),
    ]);
    const resultados = [resumen, categorias, eventos];
    setEstado({
      cargando: false,
      sinConexion: resultados.every((r) => r.status === "rejected" && r.reason?.sinConexion),
      resumen: resumen.value,
      categorias: categorias.value,
      eventos: eventos.value,
    });
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { ...estado, recargar: cargar };
}

function StatCard({ valor, etiqueta, decimales = 0, reducido }) {
  const numerico = typeof valor === "number";
  const actual = useContador(numerico ? valor : null, {
    activo: reducido === false,
    decimales,
  });
  const formatear = (n) => (decimales ? `${formatoPuntaje.format(n)} ★` : formatoEntero.format(n));
  const final = numerico ? formatear(valor) : "—";
  return (
    <CeldaStat>
      <TicketCard
        accessible
        talon={<TextoTalon numberOfLines={2}>{etiqueta}</TextoTalon>}
        accessibilityLabel={`${final} ${etiqueta}`}
      >
        <ValorStat>{numerico ? formatear(actual ?? valor) : final}</ValorStat>
      </TicketCard>
    </CeldaStat>
  );
}

function TarjetaEventoLanding({ evento, onPress }) {
  const theme = useTheme();
  return (
    <TicketCard
      onPress={onPress}
      accessibilityLabel={[
        evento.nombre,
        evento.fecha,
        evento.lugar,
        evento.desde,
        evento.quedanPocas ? "Últimas entradas" : null,
      ]
        .filter(Boolean)
        .join(". ")}
      talon={
        <FilaTalon>
          <TextoTalon>{evento.desde}</TextoTalon>
          <TextoTalon>{evento.agotado ? "Agotado" : "Comprar"}</TextoTalon>
        </FilaTalon>
      }
    >
      <ConChip>
        <ImagenEvento
          uri={evento.imagen?.uri}
          alt={evento.imagen?.alt ?? `Imagen de ${evento.nombre}`}
        />
        {evento.dia ? (
          <ChipFecha {...DECORATIVO} testID={`chip-fecha-${evento.id}`}>
            <DiaChip>{evento.dia}</DiaChip>
            <MesChip>{evento.mes}</MesChip>
          </ChipFecha>
        ) : null}
      </ConChip>
      <FilaBadges>
        <Badge variant="primary">{evento.categoria}</Badge>
        {evento.quedanPocas ? <Badge variant="warning">Últimas entradas</Badge> : null}
      </FilaBadges>
      <NombreEvento numberOfLines={2}>{evento.nombre}</NombreEvento>
      <FilaIcono>
        <CalendarDays size={16} color={theme.colors.textSecondary} accessible={false} />
        <TextoSecundario>{evento.fecha}</TextoSecundario>
      </FilaIcono>
      <FilaIcono>
        <MapPin size={16} color={theme.colors.textSecondary} accessible={false} />
        <TextoSecundario numberOfLines={1}>{evento.lugar}</TextoSecundario>
      </FilaIcono>
    </TicketCard>
  );
}

function TarjetaCategoria({ categoria, cantidad, onPress, reducido }) {
  const theme = useTheme();
  const escala = useRef(new Animated.Value(1)).current;
  const Icono = iconoCategoria(categoria.nombre);
  const textoCantidad = textoCantidadEventos(cantidad);
  const hundir = (valor) =>
    reducido
      ? undefined
      : Animated.spring(escala, {
          toValue: valor,
          speed: 40,
          bounciness: 4,
          useNativeDriver: true,
        }).start();

  return (
    <CeldaCategoria>
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Card
          onPress={onPress}
          onPressIn={() => hundir(0.97)}
          onPressOut={() => hundir(1)}
          accessibilityLabel={[categoria.nombre, textoCantidad, categoria.descripcion]
            .filter(Boolean)
            .join(". ")}
          accessibilityHint="Ingresá para explorar los eventos de esta categoría"
          testID={`categoria-landing-${categoria.id}`}
        >
          <Icono
            size={22}
            color={theme.colors.accentText}
            strokeWidth={1.75}
            accessible={false}
            testID={`icono-categoria-${categoria.id}`}
          />
          <NombreCategoria>{categoria.nombre}</NombreCategoria>
          {textoCantidad ? <CantidadCategoria>{textoCantidad}</CantidadCategoria> : null}
          <TextoSecundario numberOfLines={2}>{categoria.descripcion}</TextoSecundario>
        </Card>
      </Animated.View>
    </CeldaCategoria>
  );
}

function TarjetaResenia({ resenia }) {
  return (
    <Card>
      <FilaResenia>
        <Rating valor={resenia.puntuacion} />
        <Comillas {...DECORATIVO}>“</Comillas>
      </FilaResenia>
      <Cita>{resenia.detalle || "Excelente experiencia."}</Cita>
      <FilaIcono>
        <Avatar {...DECORATIVO}>
          <TextoAvatar>{iniciales(resenia.autor)}</TextoAvatar>
        </Avatar>
        <PieResenia>
          — {resenia.autor} · {resenia.evento}
        </PieResenia>
      </FilaIcono>
    </Card>
  );
}

/** Portada pública (sin sesión), basada en design/stitch/landing (spec 07 y 07b). */
export function Landing({ navigation }) {
  const theme = useTheme();
  const reducido = useMovimientoReducido();
  const enFoco = useIsFocused();
  const { height: altoPantalla } = useWindowDimensions();
  const { cargando, sinConexion, resumen, categorias, eventos, recargar } = useDatosLanding();
  const refScroll = useRef(null);
  const [anclas, setAnclas] = useState({});
  const [conSombra, setConSombra] = useState(false);
  const [alcance, setAlcance] = useState(altoPantalla);

  const irARegistro = (rol) => navigation.navigate("Registro", rol ? { rol } : undefined);
  const irALogin = () => navigation.navigate("Login");
  const irA = (clave) => {
    const y = anclas[clave];
    if (y == null) return;
    refScroll.current?.scrollTo({ y: Math.max(y - 72, 0), animated: !reducido });
  };

  const alScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const sombra = y > 24;
    if (sombra !== conSombra) setConSombra(sombra);
    const nuevoAlcance = y + altoPantalla;
    if (nuevoAlcance > alcance + 80) setAlcance(nuevoAlcance);
  };

  // Cada sección se mide (para anclas) y aparece cuando su borde superior entra en pantalla.
  const seccion = (clave) => ({
    reducido,
    visible: anclas[clave] != null && anclas[clave] < alcance - 40,
    alMedir: (y) =>
      setAnclas((previas) => (previas[clave] === y ? previas : { ...previas, [clave]: y })),
    testID: `seccion-${clave}`,
  });

  if (sinConexion) return <SinConexion alReintentar={recargar} />;

  const stats = resumen?.estadisticas;
  const porCategoria = resumen?.eventosPorCategoria;

  return (
    <Pantalla
      edges={["top", "left", "right"]}
      alRefrescar={recargar}
      refrescando={cargando && Boolean(resumen)}
      stickyHeaderIndices={[0]}
      refScroll={refScroll}
      alScroll={alScroll}
    >
      {/* Barra superior fija: toma fondo y sombra al scrollear. */}
      <BarraSuperior $conSombra={conSombra} testID="barra-superior">
        <Marca accessible accessibilityRole="header" accessibilityLabel="AI Ticket It">
          <IconoMarca>
            <Ticket size={22} color={theme.colors.goldOrnament} strokeWidth={1.75} />
          </IconoMarca>
          <TextoMarca>AI Ticket It</TextoMarca>
        </Marca>
        <Button size="sm" onPress={irALogin}>
          Ingresar
        </Button>
      </BarraSuperior>

      {/* Hero: telón que se abre sobre un ticket grande con reflector y sello. */}
      <ConTelon reducido={reducido}>
        <TicketCard
          perforacion="puntos"
          talon={
            <FilaTalon>
              <TextoTalon style={{ fontVariant: ["tabular-nums"] }}>
                Admite uno · Nº 000001
              </TextoTalon>
              <TextoTalon>Válido en todo el país</TextoTalon>
            </FilaTalon>
          }
        >
          <Reflector />
          <Sello>Estreno</Sello>
          <PillTagline>
            <EtiquetaSeccion>Tus entradas, sin filas</EtiquetaSeccion>
          </PillTagline>
          <TituloEscena
            texto="Viví la emoción de cada espectáculo en vivo"
            destacada="espectáculo"
            nivel="display"
          />
          <Parrafo>
            Entradas oficiales para recitales, teatro, festivales y deportes en todo el país, sin
            intermediarios ni sorpresas.
          </Parrafo>
          <Acciones>
            <Button icono={Ticket} onPress={() => irARegistro("COMPRADOR")} bloque>
              Explorar eventos
            </Button>
            <Button
              variant="outline"
              icono={Megaphone}
              onPress={() => irARegistro("ORGANIZADOR")}
              bloque
            >
              Publicar mi evento
            </Button>
          </Acciones>
        </TicketCard>
      </ConTelon>

      {/* Garantías verdaderas para esta app. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Garantías"
        contentContainerStyle={{ gap: 8 }}
        testID="garantias"
      >
        {GARANTIAS.map(({ icono: Icono, texto }) => (
          <PillGarantia key={texto} accessible accessibilityLabel={texto}>
            <Icono size={16} color={theme.colors.success} accessible={false} />
            <TextoGarantia>{texto}</TextoGarantia>
          </PillGarantia>
        ))}
      </ScrollView>

      {/* Stat cards tipo talón, con contadores. */}
      <GrillaStats>
        {stats ? (
          <>
            <StatCard valor={stats.eventosActivos} etiqueta="Eventos activos" reducido={reducido} />
            <StatCard
              valor={stats.entradasVendidas}
              etiqueta="Entradas vendidas"
              reducido={reducido}
            />
            <StatCard valor={stats.organizadores} etiqueta="Organizadores" reducido={reducido} />
            <StatCard
              valor={stats.puntajePromedio ?? undefined}
              etiqueta="Puntaje promedio"
              decimales={1}
              reducido={reducido}
            />
          </>
        ) : cargando ? (
          [0, 1, 2, 3].map((i) => (
            <CeldaStat key={i}>
              <Skeleton alto={96} radio={18} />
            </CeldaStat>
          ))
        ) : null}
      </GrillaStats>

      <Ornamento />

      {/* Próximos eventos, bajo una marquesina. */}
      <Revelar {...seccion("cartelera")}>
        <Marquesina reducido={reducido} animar={enFoco}>
          <FilaTitulo>
            <TextosTitulo>
              <EtiquetaSeccion>Cartelera en vivo</EtiquetaSeccion>
              <TituloEscena texto="Próximos eventos" destacada="eventos" />
            </TextosTitulo>
            <LinkVerTodos
              onPress={irALogin}
              accessibilityRole="link"
              accessibilityLabel="Ver todos los eventos"
              accessibilityHint="Ingresá para ver la cartelera completa"
              testID="ver-todos"
            >
              <TextoVerTodos>Ver todos</TextoVerTodos>
              <ArrowRight size={16} color={theme.colors.accentText} accessible={false} />
            </LinkVerTodos>
          </FilaTitulo>
        </Marquesina>
        {eventos ? (
          <Carrusel
            items={eventos}
            etiqueta="Próximos eventos"
            renderItem={(evento) => <TarjetaEventoLanding evento={evento} onPress={irALogin} />}
          />
        ) : cargando ? (
          <SkeletonCard />
        ) : (
          <ErrorState titulo="No pudimos cargar la cartelera" alReintentar={recargar} />
        )}
      </Revelar>

      {/* Categorías */}
      <Revelar {...seccion("categorias")}>
        <EtiquetaSeccion>Clasificación</EtiquetaSeccion>
        <TituloEscena texto="Explorá por categoría" destacada="categoría" />
        <GrillaCategorias>
          {(categorias ?? []).map((categoria) => (
            <TarjetaCategoria
              key={categoria.id}
              categoria={categoria}
              cantidad={porCategoria ? (porCategoria[categoria.id] ?? 0) : null}
              onPress={irALogin}
              reducido={reducido}
            />
          ))}
        </GrillaCategorias>
      </Revelar>

      <Ornamento />

      {/* Cómo funciona: pasos unidos por una perforación. */}
      <Revelar {...seccion("comoFunciona")}>
        <Card>
          <EtiquetaSeccion>Guía de ventanilla</EtiquetaSeccion>
          <TituloEscena texto="¿Cómo funciona?" destacada="funciona" nivel="title" />
          {PASOS.map((paso, i) => (
            <Paso key={paso.titulo}>
              <ColumnaPaso>
                <NumeroPaso accessible={false}>
                  <TextoNumero>{String(i + 1).padStart(2, "0")}</TextoNumero>
                </NumeroPaso>
                {i < PASOS.length - 1 ? <PerforacionVertical /> : null}
              </ColumnaPaso>
              <TextosPaso $ultimo={i === PASOS.length - 1}>
                <TituloPaso>{paso.titulo}</TituloPaso>
                <TextoSecundario>{paso.texto}</TextoSecundario>
              </TextosPaso>
            </Paso>
          ))}
        </Card>
      </Revelar>

      {/* Compradores / organizadores */}
      <Revelar {...seccion("paraTodos")}>
        <EtiquetaSeccion>Experiencia</EtiquetaSeccion>
        <TituloEscena texto="Pensado para todos" destacada="todos" />
        {[
          { titulo: "Para compradores", items: PARA_COMPRADORES, icono: Ticket },
          { titulo: "Para organizadores", items: PARA_ORGANIZADORES, icono: Megaphone },
        ].map(({ titulo, items, icono: Icono }) => (
          <Card key={titulo}>
            <FilaIcono>
              <Icono size={20} color={theme.colors.accentText} accessible={false} />
              <TituloPaso>{titulo}</TituloPaso>
            </FilaIcono>
            {items.map((item) => (
              <FilaIcono key={item}>
                <ShieldCheck size={16} color={theme.colors.success} accessible={false} />
                <TextoSecundario>{item}</TextoSecundario>
              </FilaIcono>
            ))}
          </Card>
        ))}
      </Revelar>

      {/* Reseñas destacadas, como críticas de diario. */}
      {resumen?.resenias?.length ? (
        <>
          <Ornamento />
          <Revelar {...seccion("resenias")}>
            <EtiquetaSeccion>Comunidad</EtiquetaSeccion>
            <TituloEscena texto="Opiniones de espectadores" destacada="espectadores" />
            <Carrusel
              items={resumen.resenias}
              etiqueta="Reseñas destacadas"
              renderItem={(resenia) => <TarjetaResenia resenia={resenia} />}
            />
          </Revelar>
        </>
      ) : null}

      {/* Banner final en terciopelo. */}
      <Revelar {...seccion("banner")}>
        <Banner>
          <TexturaPliegues />
          <ContenidoBanner>
            <FilaIcono>
              <Sparkles size={18} color={theme.colors.goldOnVelvet} accessible={false} />
              <EtiquetaBanner>✦ Tu próxima función</EtiquetaBanner>
            </FilaIcono>
            <TituloEscena
              texto="Creá tu cuenta gratis y empezá hoy"
              destacada="gratis"
              nivel="title"
              color={theme.colors.onVelvet}
              colorDestacada={theme.colors.goldOnVelvet}
            />
            <FilaIcono>
              <CircleDollarSign size={16} color={theme.colors.onVelvet} accessible={false} />
              <TextoBanner>Precios finales, sin sorpresas al pagar.</TextoBanner>
            </FilaIcono>
            <TextoBanner>Registro gratuito · Sin comisión oculta</TextoBanner>
            <Button variant="invertido" onPress={() => irARegistro()} bloque>
              Crear mi cuenta
            </Button>
          </ContenidoBanner>
          <Fleco />
        </Banner>
      </Revelar>

      <Footer
        secciones={[
          {
            titulo: "Plataforma",
            links: [
              { etiqueta: "¿Cómo funciona?", alPresionar: () => irA("comoFunciona") },
              { etiqueta: "Para organizadores", alPresionar: () => irA("paraTodos") },
              { etiqueta: "Próximos eventos", alPresionar: () => irA("cartelera") },
            ],
          },
          {
            titulo: "Cuenta",
            links: [
              { etiqueta: "Ingresar", alPresionar: irALogin },
              { etiqueta: "Crear cuenta", alPresionar: () => irARegistro() },
              { etiqueta: "Publicar un evento", alPresionar: () => irARegistro("ORGANIZADOR") },
            ],
          },
        ]}
      />
    </Pantalla>
  );
}

const BarraSuperior = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  margin: -20px -20px 0;
  padding: 12px 20px;
  background-color: ${({ theme, $conSombra }) =>
    $conSombra ? theme.colors.surface : theme.colors.background};
  border-bottom-width: ${({ $conSombra }) => ($conSombra ? 1 : 0)}px;
  border-bottom-color: ${({ theme }) => theme.colors.divider};
  elevation: ${({ $conSombra }) => ($conSombra ? 4 : 0)};
  shadow-color: ${({ theme }) => theme.colors.sombra};
  shadow-opacity: ${({ $conSombra }) => ($conSombra ? 1 : 0)};
  shadow-radius: 12px;
  shadow-offset: 0px 4px;
`;

const Marca = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const IconoMarca = styled.View`
  transform: rotate(-12deg);
`;

const TextoMarca = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PillTagline = styled.View`
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const Parrafo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 26px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Acciones = styled.View`
  gap: 12px;
  margin-top: 8px;
`;

const PillGarantia = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoGarantia = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const GrillaStats = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin: -6px;
`;

const CeldaStat = styled.View`
  width: 50%;
  padding: 6px;
`;

const ValorStat = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.headline}px;
  font-variant: tabular-nums;
  color: ${({ theme }) => theme.colors.accentText};
`;

const FilaTitulo = styled.View`
  flex-direction: row;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
`;

const TextosTitulo = styled.View`
  flex: 1;
  gap: 4px;
`;

const LinkVerTodos = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  min-height: 44px;
  min-width: 44px;
  justify-content: flex-end;
`;

const TextoVerTodos = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const ConChip = styled.View``;

const ChipFecha = styled.View`
  position: absolute;
  top: 10px;
  left: 10px;
  min-width: 52px;
  padding: 6px 10px;
  align-items: center;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.ticketStub};
`;

const DiaChip = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  line-height: 26px;
  color: ${({ theme }) => theme.colors.onTicketStub};
`;

const MesChip = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: 1.5px;
  color: ${({ theme }) => theme.colors.onTicketStub};
`;

const FilaBadges = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 6px;
`;

const NombreEvento = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FilaIcono = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const TextoSecundario = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
  gap: 8px;
`;

const GrillaCategorias = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  margin: -6px;
`;

const CeldaCategoria = styled.View`
  width: 50%;
  padding: 6px;
`;

const NombreCategoria = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const CantidadCategoria = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.gold};
`;

const Paso = styled.View`
  flex-direction: row;
  gap: 14px;
  align-items: stretch;
  padding-top: 8px;
`;

const ColumnaPaso = styled.View`
  width: 40px;
  align-items: center;
`;

const NumeroPaso = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
  border-width: 2px;
  border-color: ${({ theme }) => theme.colors.goldOrnament};
`;

const TextoNumero = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.onPrimary};
`;

const TextosPaso = styled.View`
  flex: 1;
  gap: 2px;
  padding-bottom: ${({ $ultimo }) => ($ultimo ? 0 : 12)}px;
`;

const TituloPaso = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const FilaResenia = styled.View`
  flex-direction: row;
  align-items: flex-start;
  justify-content: space-between;
`;

const Comillas = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: 56px;
  line-height: 56px;
  margin-bottom: -28px;
  color: ${({ theme }) => theme.colors.goldOrnament};
`;

const Cita = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Avatar = styled.View`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoAvatar = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const PieResenia = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Banner = styled.View`
  overflow: hidden;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.velvet};
  padding-bottom: 10px;
`;

const ContenidoBanner = styled.View`
  padding: 20px;
  gap: 10px;
`;

const EtiquetaBanner = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacingLabel}px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.goldOnVelvet};
`;

const TextoBanner = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 20px;
  color: ${({ theme }) => theme.colors.onVelvet};
`;

export default Landing;
