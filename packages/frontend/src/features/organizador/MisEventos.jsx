import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { CalendarPlus, PlusCircle } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { TarjetaEventoOrganizador } from "../../components/organizador/TarjetaEventoOrganizador";
import {
  Button,
  EmptyState,
  ErrorState,
  EtiquetaSeccion,
  Rating,
  Segmentos,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { authService } from "../../service/authService";
import { organizadorService } from "../../service/organizadorService";

/** Mis eventos: puntaje propio, Próximos / Anteriores, tarjetas con ocupación y reembolsos. */
export function MisEventos({ navigation }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [seccion, setSeccion] = useState("proximos");

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
      <Cabecera>
        <Textos>
          <EtiquetaSeccion>Tu cartelera</EtiquetaSeccion>
          <TituloEscena texto="Mis eventos" destacada="eventos" />
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
          ordenados.map((evento) => (
            <TarjetaEventoOrganizador
              key={evento.id}
              evento={evento}
              onPress={() =>
                navigation.navigate("ComprasEvento", { eventoId: evento.id, nombre: evento.nombre })
              }
              onEditar={() => navigation.navigate("EditarEvento", { eventoId: evento.id })}
            />
          ))
        )}
      </Lista>
    </Pantalla>
  );
}

const Cabecera = styled.View`
  flex-direction: row;
  align-items: flex-start;
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

export default MisEventos;
