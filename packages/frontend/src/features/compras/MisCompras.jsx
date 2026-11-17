import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { Ticket } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { ModalCalificar } from "../../components/compras/ModalCalificar";
import { TarjetaCompra } from "../../components/compras/TarjetaCompra";
import {
  EmptyState,
  ErrorState,
  Segmentos,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useEstadoCompra } from "../../hooks/useEstadoCompra";
import { comprasService, FILTROS_ESTADO } from "../../service/comprasService";

/** Mis compras: segmentos por estado con contador, tarjetas con su acción, refresco al volver. */
export function MisCompras({ navigation }) {
  const [estado, setEstado] = useState({ cargando: true });
  const [filtro, setFiltro] = useState(null);
  const [calificando, setCalificando] = useState(null);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({ cargando: false, compras: await comprasService.mias() });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, []);

  // Se recarga cada vez que se vuelve a la pantalla (después de pagar, cancelar o calificar).
  // compra:estado (socket): otra persona o el sistema cambió una compra → se recarga.
  useEstadoCompra(null, cargar);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const compras = useMemo(() => estado.compras ?? [], [estado.compras]);
  const opciones = useMemo(
    () =>
      FILTROS_ESTADO.map((f) => ({
        ...f,
        contador: f.valor ? compras.filter((c) => c.estado === f.valor).length : compras.length,
      })),
    [compras],
  );
  const visibles = filtro ? compras.filter((c) => c.estado === filtro) : compras;
  const abrir = (compra) => navigation.navigate("DetalleCompra", { compraId: compra.id });

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(estado.compras)}>
      <TituloEscena texto="Mis compras" destacada="compras" />
      <Segmentos
        etiqueta="Filtrar por estado"
        opciones={opciones}
        valor={filtro}
        onCambiar={setFiltro}
      />
      <Lista>
        {estado.cargando && !estado.compras ? (
          <SkeletonLista cantidad={4} />
        ) : estado.error && !estado.compras ? (
          <ErrorState
            titulo="No pudimos cargar tus compras"
            mensaje={estado.error.message}
            alReintentar={cargar}
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            icono={Ticket}
            titulo={filtro ? "No hay compras en este estado" : "Todavía no compraste entradas"}
            mensaje="Buscá tu próxima función en la cartelera."
            accion={{
              etiqueta: "Explorar eventos",
              alPresionar: () => navigation.navigate("Explorar"),
            }}
          />
        ) : (
          visibles.map((compra) => (
            <TarjetaCompra
              key={compra.id}
              compra={compra}
              onPress={() => abrir(compra)}
              onPagar={() => navigation.navigate("Checkout", { compraId: compra.id })}
              onCalificar={() => setCalificando(compra)}
            />
          ))
        )}
      </Lista>
      <ModalCalificar
        visible={Boolean(calificando)}
        compra={calificando}
        alCerrar={() => setCalificando(null)}
        alCalificar={cargar}
      />
    </Pantalla>
  );
}

const Lista = styled.View`
  gap: 16px;
`;

export default MisCompras;
