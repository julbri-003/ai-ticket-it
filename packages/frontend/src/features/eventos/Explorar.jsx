import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import styled from "styled-components/native";
import { SearchX } from "lucide-react-native";
import { Footer } from "../../components/layout/Footer";
import { Pantalla } from "../../components/layout/Pantalla";
import { BarraFiltros, PillsFiltrosAplicados } from "../../components/eventos/BarraFiltros";
import { Buscador } from "../../components/eventos/Buscador";
import { CarruselRecomendados } from "../../components/eventos/CarruselRecomendados";
import { PanelFiltros } from "../../components/eventos/PanelFiltros";
import { TarjetaEvento } from "../../components/eventos/TarjetaEvento";
import {
  EmptyState,
  ErrorState,
  ListaEscalonada,
  Marquesina,
  Ornamento,
  Paginacion,
  Segmentos,
  SkeletonCard,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useFavorito } from "../../hooks/useFavorito";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { pillsAplicadas, useFiltrosEventos } from "../../hooks/useFiltrosEventos";
import { eventosService } from "../../service/eventosService";

/** Resultados del buscador para la query actual. */
function useResultados(query) {
  const [estado, setEstado] = useState({ cargando: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEstado((previo) => ({ ...previo, cargando: true, error: null }));
    eventosService
      .buscar(query)
      .then((datos) => vigente && setEstado({ cargando: false, datos }))
      .catch((error) => vigente && setEstado({ cargando: false, error }));
    return () => {
      vigente = false;
    };
  }, [query, version]);

  return { ...estado, recargar: () => setVersion((v) => v + 1) };
}

/**
 * Explorar: recomendados (solo comprador), buscador, barra de filtros fija, pills de filtros
 * aplicados, Próximos / Anteriores, lista paginada y Footer.
 */
export function Explorar({ navigation }) {
  const { esComprador } = useAuth();
  const filtrosHook = useFiltrosEventos();
  const {
    filtros,
    query,
    filtrosActivos,
    aplicar,
    setPagina,
    quitar,
    limpiar,
    toggleCategoria,
    toggleParaVos,
  } = filtrosHook;
  const { cargando, error, datos, recargar } = useResultados(query);
  const [categorias, setCategorias] = useState([]);
  const [paraVosDisponible, setParaVosDisponible] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [versionRecomendados, setVersionRecomendados] = useState(0);
  const scroll = useRef(null);
  const reducido = useMovimientoReducido();
  const enFoco = useIsFocused();

  const favoritos = useFavorito({ alCambiar: () => setVersionRecomendados((v) => v + 1) });

  useEffect(() => {
    eventosService
      .categorias()
      .then(setCategorias)
      .catch(() => {});
  }, []);

  const pills = useMemo(() => pillsAplicadas(filtros, categorias), [filtros, categorias]);
  const abrirEvento = useCallback(
    (evento) => navigation.navigate("DetalleEvento", { eventoId: evento.id }),
    [navigation],
  );

  const refrescar = () => {
    recargar();
    setVersionRecomendados((v) => v + 1);
  };

  const cambiarPagina = (pagina) => {
    setPagina(pagina);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const encabezado = datos
    ? `${datos.total} ${datos.total === 1 ? "evento" : "eventos"}${datos.filtrosAplicados?.paraVos ? " para vos" : ""}`
    : "";

  return (
    <>
      <Pantalla
        alRefrescar={refrescar}
        refrescando={cargando && Boolean(datos)}
        stickyHeaderIndices={[2]}
        refScroll={scroll}
      >
        {/* Un solo hijo antes del buscador: la barra de filtros sigue en el índice fijo 2. */}
        {esComprador ? (
          <BloqueRecomendados>
            <CarruselRecomendados
              onVerTodos={() => {
                if (!filtros.paraVos) toggleParaVos();
              }}
              onAbrirEvento={abrirEvento}
              onDisponibilidad={setParaVosDisponible}
              recargarCon={versionRecomendados}
            />
            <Ornamento />
          </BloqueRecomendados>
        ) : (
          <Vacio />
        )}

        <Buscador valor={filtros.q} onBuscar={(q) => aplicar({ q })} />

        <BarraFiltros
          filtros={filtros}
          categorias={categorias}
          paraVosDisponible={esComprador && paraVosDisponible}
          filtrosActivos={filtrosActivos}
          onParaVos={toggleParaVos}
          onTodas={() => aplicar({ categoriaIds: [] })}
          onCategoria={toggleCategoria}
          onAbrirFiltros={() => setPanelAbierto(true)}
        />

        <PillsFiltrosAplicados pills={pills} onQuitar={quitar} onLimpiar={limpiar} />

        <Segmentos
          etiqueta="Cartelera"
          valor={filtros.anteriores}
          onCambiar={(anteriores) => aplicar({ anteriores })}
          opciones={[
            { valor: false, etiqueta: "Próximos" },
            { valor: true, etiqueta: "Anteriores" },
          ]}
        />

        {datos && !error ? (
          <Marquesina reducido={reducido} animar={enFoco}>
            <Resumen
              accessibilityRole="header"
              accessibilityLiveRegion="polite"
              testID="cantidad-resultados"
            >
              {encabezado}
            </Resumen>
          </Marquesina>
        ) : null}

        <Lista>
          {cargando && !datos ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : error ? (
            <ErrorState
              titulo="No pudimos cargar los eventos"
              mensaje={error.message}
              alReintentar={recargar}
            />
          ) : datos.items.length === 0 ? (
            <EmptyState
              icono={SearchX}
              titulo="No encontramos eventos"
              mensaje="Probá con otra búsqueda o quitá algún filtro."
              accion={
                pills.length ? { etiqueta: "Limpiar filtros", alPresionar: limpiar } : undefined
              }
            />
          ) : (
            <ListaEscalonada reducido={reducido} testID="lista-eventos">
              {datos.items.map((evento) => (
                <TarjetaEvento
                  key={evento.id}
                  evento={evento}
                  onPress={() => abrirEvento(evento)}
                  esFavorito={favoritos.esFavorito(evento)}
                  onFavorito={esComprador ? () => favoritos.alternar(evento) : undefined}
                />
              ))}
            </ListaEscalonada>
          )}
        </Lista>

        {datos && !error ? (
          <Paginacion
            pagina={datos.pagina}
            total={datos.total}
            limite={datos.limite}
            onCambiar={cambiarPagina}
          />
        ) : null}

        <Footer />
      </Pantalla>

      <PanelFiltros
        visible={panelAbierto}
        filtros={filtros}
        contar={eventosService.contar}
        onCerrar={() => setPanelAbierto(false)}
        onAplicar={(borrador) => {
          aplicar(borrador);
          setPanelAbierto(false);
        }}
      />
    </>
  );
}

const Vacio = styled.View``;

const BloqueRecomendados = styled.View`
  gap: 16px;
`;

const Resumen = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.label}px;
  letter-spacing: ${({ theme }) => theme.typography.letterSpacingLabel}px;
  text-transform: uppercase;
  text-align: center;
  color: ${({ theme }) => theme.colors.gold};
`;

const Lista = styled.View`
  gap: 16px;
`;

export default Explorar;
