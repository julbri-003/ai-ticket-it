import { useCallback, useEffect, useState } from "react";
import styled, { useTheme } from "styled-components/native";
import {
  CalendarDays,
  CircleDollarSign,
  Clapperboard,
  MapPin,
  Megaphone,
  ShieldCheck,
  Sparkles,
  Ticket,
} from "lucide-react-native";
import { Footer } from "../../components/layout/Footer";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Badge,
  Button,
  Card,
  Carrusel,
  ErrorState,
  EtiquetaSeccion,
  ImagenEvento,
  Rating,
  Skeleton,
  SkeletonCard,
  TextoTalon,
  TicketCard,
  TituloEscena,
} from "../../components/ui";
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

function StatCard({ valor, etiqueta }) {
  return (
    <CeldaStat>
      <TicketCard
        talon={<TextoTalon numberOfLines={2}>{etiqueta}</TextoTalon>}
        accessibilityLabel={`${valor} ${etiqueta}`}
      >
        <ValorStat>{valor}</ValorStat>
      </TicketCard>
    </CeldaStat>
  );
}

function TarjetaEventoLanding({ evento, onPress }) {
  const theme = useTheme();
  return (
    <TicketCard
      onPress={onPress}
      accessibilityLabel={`${evento.nombre}, ${evento.fecha}, ${evento.lugar}. ${evento.desde}`}
      talon={
        <FilaTalon>
          <TextoTalon>{evento.desde}</TextoTalon>
          <TextoTalon>{evento.agotado ? "Agotado" : "Comprar"}</TextoTalon>
        </FilaTalon>
      }
    >
      <ImagenEvento
        uri={evento.imagen?.uri}
        alt={evento.imagen?.alt ?? `Imagen de ${evento.nombre}`}
      />
      <Badge variant="primary">{evento.categoria}</Badge>
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

/** Portada pública (sin sesión), basada en design/stitch/landing. */
export function Landing({ navigation }) {
  const theme = useTheme();
  const { cargando, sinConexion, resumen, categorias, eventos, recargar } = useDatosLanding();
  const irARegistro = (rol) => navigation.navigate("Registro", rol ? { rol } : undefined);
  const irALogin = () => navigation.navigate("Login");

  if (sinConexion) return <SinConexion alReintentar={recargar} />;

  const stats = resumen?.estadisticas;

  return (
    <Pantalla
      edges={["top", "left", "right"]}
      alRefrescar={recargar}
      refrescando={cargando && Boolean(resumen)}
    >
      <BarraSuperior>
        <Marca accessibilityRole="header">AI Ticket It</Marca>
        <Button size="sm" onPress={irALogin}>
          Ingresar
        </Button>
      </BarraSuperior>

      {/* Hero: ticket grande destacado */}
      <TicketCard
        talon={
          <FilaTalon>
            <TextoTalon>Admite uno · Nº 000001</TextoTalon>
            <TextoTalon>Válido en todo el país</TextoTalon>
          </FilaTalon>
        }
      >
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

      {/* Stat cards tipo talón */}
      <GrillaStats>
        {stats ? (
          <>
            <StatCard valor={stats.eventosActivos} etiqueta="Eventos activos" />
            <StatCard valor={stats.entradasVendidas} etiqueta="Entradas vendidas" />
            <StatCard valor={stats.organizadores} etiqueta="Organizadores" />
            <StatCard
              valor={
                stats.puntajePromedio != null
                  ? `${String(stats.puntajePromedio).replace(".", ",")} ★`
                  : "—"
              }
              etiqueta="Puntaje promedio"
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

      {/* Próximos eventos */}
      <Seccion>
        <EtiquetaSeccion>Cartelera en vivo</EtiquetaSeccion>
        <TituloEscena texto="Próximos eventos" destacada="eventos" />
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
      </Seccion>

      {/* Categorías */}
      <Seccion>
        <EtiquetaSeccion>Clasificación</EtiquetaSeccion>
        <TituloEscena texto="Explorá por categoría" destacada="categoría" />
        <GrillaCategorias>
          {(categorias ?? []).map((categoria) => (
            <CeldaCategoria key={categoria.id}>
              <Card
                onPress={irALogin}
                accessibilityLabel={`${categoria.nombre}. ${categoria.descripcion ?? ""}`}
                accessibilityHint="Ingresá para explorar los eventos de esta categoría"
                testID={`categoria-landing-${categoria.id}`}
              >
                <Clapperboard
                  size={22}
                  color={theme.colors.accentText}
                  strokeWidth={1.75}
                  accessible={false}
                />
                <NombreCategoria>{categoria.nombre}</NombreCategoria>
                <TextoSecundario numberOfLines={2}>{categoria.descripcion}</TextoSecundario>
              </Card>
            </CeldaCategoria>
          ))}
        </GrillaCategorias>
      </Seccion>

      {/* Cómo funciona */}
      <Card>
        <EtiquetaSeccion>Guía de ventanilla</EtiquetaSeccion>
        <TituloEscena texto="¿Cómo funciona?" destacada="funciona" nivel="title" />
        {PASOS.map((paso, i) => (
          <Paso key={paso.titulo}>
            <NumeroPaso accessible={false}>
              <TextoNumero>{String(i + 1).padStart(2, "0")}</TextoNumero>
            </NumeroPaso>
            <TextosPaso>
              <TituloPaso>{paso.titulo}</TituloPaso>
              <TextoSecundario>{paso.texto}</TextoSecundario>
            </TextosPaso>
          </Paso>
        ))}
      </Card>

      {/* Compradores / organizadores */}
      <Seccion>
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
      </Seccion>

      {/* Reseñas destacadas */}
      {resumen?.resenias?.length ? (
        <Seccion>
          <EtiquetaSeccion>Comunidad</EtiquetaSeccion>
          <TituloEscena texto="Opiniones de espectadores" destacada="espectadores" />
          <Carrusel
            items={resumen.resenias}
            etiqueta="Reseñas destacadas"
            renderItem={(resenia) => (
              <Card>
                <Rating valor={resenia.puntuacion} />
                <Cita>“{resenia.detalle || "Excelente experiencia."}”</Cita>
                <TextoSecundario>
                  {resenia.autor} · {resenia.evento}
                </TextoSecundario>
              </Card>
            )}
          />
        </Seccion>
      ) : null}

      {/* Banner final */}
      <TicketCard
        talon={
          <FilaTalon>
            <TextoTalon>Registro gratuito</TextoTalon>
            <TextoTalon>Sin comisión oculta</TextoTalon>
          </FilaTalon>
        }
      >
        <FilaIcono>
          <Sparkles size={18} color={theme.colors.gold} accessible={false} />
          <EtiquetaSeccion>Tu próxima función</EtiquetaSeccion>
        </FilaIcono>
        <TituloEscena texto="Creá tu cuenta gratis y empezá hoy" destacada="gratis" nivel="title" />
        <FilaIcono>
          <CircleDollarSign size={16} color={theme.colors.textSecondary} accessible={false} />
          <TextoSecundario>Precios finales, sin sorpresas al pagar.</TextoSecundario>
        </FilaIcono>
        <Button onPress={() => irARegistro()} bloque>
          Crear mi cuenta
        </Button>
      </TicketCard>

      <Footer
        links={[
          { etiqueta: "Ingresar", alPresionar: irALogin },
          { etiqueta: "Crear cuenta", alPresionar: () => irARegistro() },
          { etiqueta: "Publicar un evento", alPresionar: () => irARegistro("ORGANIZADOR") },
        ]}
      />
    </Pantalla>
  );
}

const BarraSuperior = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Marca = styled.Text`
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
  color: ${({ theme }) => theme.colors.accentText};
`;

const Seccion = styled.View`
  gap: 12px;
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

const Paso = styled.View`
  flex-direction: row;
  gap: 14px;
  align-items: flex-start;
  padding-top: 8px;
`;

const NumeroPaso = styled.View`
  width: 40px;
  height: 40px;
  border-radius: 20px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoNumero = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.onPrimary};
`;

const TextosPaso = styled.View`
  flex: 1;
  gap: 2px;
`;

const TituloPaso = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Cita = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export default Landing;
