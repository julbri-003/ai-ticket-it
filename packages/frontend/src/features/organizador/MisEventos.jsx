import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import styled from "styled-components/native";
import { CalendarPlus, PlusCircle } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { TarjetaEventoOrganizador } from "../../components/organizador/TarjetaEventoOrganizador";
import {
  Button,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  ListaEscalonada,
  Marquesina,
  Rating,
  Segmentos,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { authService } from "../../service/authService";
import { useContador } from "../../hooks/useContador";
import { useMovimientoReducido } from "../../hooks/useMovimientoReducido";
import { organizadorService, resumenOrganizador } from "../../service/organizadorService";

const formatoEntero = new Intl.NumberFormat("es-AR");

/** Dato del resumen que cuenta desde 0 (una vez); el label siempre lleva el valor final. */
function DatoResumen({ valor, etiqueta, sufijo = "", alerta = false, reducido, testID }) {
  const primero = useRef(valor);
  const actual = useContador(valor, {
    activo: reducido === false && valor === primero.current,
    duracion: 1000,
  });
  const final = `${formatoEntero.format(valor)}${sufijo}`;
  return (
    <CeldaResumen accessible accessibilityLabel={`${final} ${etiqueta}`} testID={testID}>
      <ValorResumen $alerta={alerta}>
        {formatoEntero.format(actual ?? valor)}
        {sufijo}
      </ValorResumen>
      <EtiquetaResumen numberOfLines={2}>{etiqueta}</EtiquetaResumen>
    </CeldaResumen>
  );
}

/**
 * Mis eventos: cabecera en marquesina, resumen (vendidas, ocupación, reembolsos), puntaje propio,
 * Próximos / Anteriores / Cancelados y tarjetas con ocupación y reembolsos.
 */
export function MisEventos({ navigation }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [seccion, setSeccion] = useState("proximos");
  const reducido = useMovimientoReducido();
  const enFoco = useIsFocused();
  // Cada segmento anima su lista solo la primera vez que se abre.
  const vistos = useRef(new Set());
  const animarSeccion = !vistos.current.has(seccion);
  useEffect(() => {
    if (estado.eventos) vistos.current.add(seccion);
  }, [seccion, estado.eventos]);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      const [eventos, yo] = await Promise.all([
        organizadorService.misEventos(),
        authService.obtenerActual(),
      ]);
      setEstado({ cargando: false, eventos, yo });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const todos = estado.eventos ?? [];
  const resumen = resumenOrganizador(todos);
  const porSeccion = {
    proximos: todos.filter((e) => !e.cancelado && !e.anterior),
    anteriores: todos.filter((e) => e.anterior),
    cancelados: todos.filter((e) => e.cancelado),
  };
  const eventos = porSeccion[seccion];
  const ordenados =
    seccion === "proximos"
      ? [...eventos].sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha))
      : eventos;
  const vacio = {
    proximos: "No tenés eventos próximos",
    anteriores: "Todavía no tenés eventos anteriores",
    cancelados: "No cancelaste ningún evento",
  }[seccion];

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(estado.eventos)}>
      <Marquesina reducido={reducido} animar={enFoco}>
        <EtiquetaSeccion>Tu cartelera</EtiquetaSeccion>
        <TituloEscena texto="Mis eventos" destacada="eventos" />
      </Marquesina>
      <Cabecera>
        <Textos>
          {estado.yo ? (
            <Rating
              valor={estado.yo.puntajePromedio ?? 0}
              cantidad={estado.yo.cantidadResenias ?? 0}
            />
          ) : null}
        </Textos>
        <Button
          icono={PlusCircle}
          size="sm"
          onPress={() => navigation.navigate("Crear")}
          accessibilityLabel="Crear evento"
        >
          Crear
        </Button>
      </Cabecera>

      {todos.length > 0 ? (
        <Resumen testID="resumen-organizador">
          <DatoResumen
            valor={resumen.vendidas}
            etiqueta="Entradas vendidas"
            reducido={reducido}
            testID="resumen-vendidas"
          />
          <DatoResumen
            valor={resumen.ocupacion}
            sufijo=" %"
            etiqueta="Ocupación promedio"
            reducido={reducido}
            testID="resumen-ocupacion"
          />
          <DatoResumen
            valor={resumen.reembolsos}
            etiqueta="Reembolsos pendientes"
            alerta={resumen.reembolsos > 0}
            reducido={reducido}
            testID="resumen-reembolsos"
          />
        </Resumen>
      ) : null}

      <Segmentos
        etiqueta="Mis eventos"
        valor={seccion}
        onCambiar={setSeccion}
        opciones={[
          { valor: "proximos", etiqueta: "Próximos", contador: porSeccion.proximos.length },
          { valor: "anteriores", etiqueta: "Anteriores", contador: porSeccion.anteriores.length },
          { valor: "cancelados", etiqueta: "Cancelados", contador: porSeccion.cancelados.length },
        ]}
      />

      <Lista>
        {estado.cargando && !estado.eventos ? (
          <SkeletonLista cantidad={3} />
        ) : estado.error && !estado.eventos ? (
          <ErrorState
            titulo="No pudimos cargar tus eventos"
            mensaje={estado.error.message}
            alReintentar={cargar}
          />
        ) : ordenados.length === 0 ? (
          <EmptyState
            icono={CalendarPlus}
            titulo={vacio}
            mensaje="Publicá tu próxima función y empezá a vender entradas."
            accion={{ etiqueta: "Crear evento", alPresionar: () => navigation.navigate("Crear") }}
          />
        ) : (
          <ListaEscalonada
            key={seccion}
            reducido={reducido}
            animar={animarSeccion}
            testID="lista-mis-eventos"
          >
            {ordenados.map((evento) => (
              <TarjetaEventoOrganizador
                key={evento.id}
                evento={evento}
                onPress={() =>
                  navigation.navigate("ComprasEvento", {
                    eventoId: evento.id,
                    nombre: evento.nombre,
                  })
                }
                onEditar={() => navigation.navigate("EditarEvento", { eventoId: evento.id })}
              />
            ))}
          </ListaEscalonada>
        )}
      </Lista>
    </Pantalla>
  );
}

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Textos = styled.View`
  flex: 1;
  gap: 6px;
`;

const Lista = styled.View`
  gap: 16px;
`;

const Resumen = styled.View`
  flex-direction: row;
  gap: 8px;
`;

const CeldaResumen = styled.View`
  flex: 1;
  gap: 2px;
  padding: 10px 8px;
  align-items: center;
  border-width: 1px;
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  border-color: ${({ theme }) => theme.colors.divider};
  background-color: ${({ theme }) => theme.colors.surface};
`;

const ValorResumen = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  font-variant: tabular-nums;
  color: ${({ theme, $alerta }) => ($alerta ? theme.colors.error : theme.colors.textPrimary)};
`;

const EtiquetaResumen = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

export default MisEventos;
