import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import styled from "styled-components/native";
import { Inbox, RotateCcw } from "lucide-react-native";
import { Pantalla } from "../../components/layout/Pantalla";
import { BarraOcupacion } from "../../components/organizador/BarraOcupacion";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  EstadoCompraBadge,
  EtiquetaSeccion,
  ModalConfirmacion,
  SkeletonLista,
  TituloEscena,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { FILTROS_ESTADO } from "../../service/comprasService";
import { useEstadoCompra } from "../../hooks/useEstadoCompra";
import { organizadorService } from "../../service/organizadorService";
import { ETIQUETAS_ESTADO } from "../../utils/estadosCompra";

/**
 * Compras de un evento (vista del organizador): resumen por tipo con "Quedan N", totales,
 * filtro por estado y lista con el botón Reembolsar en las canceladas con reembolso pendiente.
 */
export function ComprasEvento({ route, navigation }) {
  const { eventoId, nombre } = route.params;
  const { usuario } = useAuth();
  const toast = useToast();
  const [filtro, setFiltro] = useState(null);
  const [estado, setEstado] = useState({ cargando: true });
  const [aReembolsar, setAReembolsar] = useState(null);
  const [reembolsando, setReembolsando] = useState(false);

  const cargar = useCallback(async () => {
    setEstado((e) => ({ ...e, cargando: true, error: null }));
    try {
      setEstado({
        cargando: false,
        datos: await organizadorService.comprasDelEvento(eventoId, { estado: filtro }),
      });
    } catch (error) {
      setEstado((e) => ({ ...e, cargando: false, error }));
    }
  }, [eventoId, filtro]);

  // compra:estado (socket): otra persona o el sistema cambió una compra → se recarga.
  useEstadoCompra(null, cargar);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const reembolsar = async () => {
    setReembolsando(true);
    try {
      await organizadorService.reembolsar(aReembolsar.id, usuario.id);
      toast.success(
        `Registraste el reembolso de ${aReembolsar.totalTexto} a ${aReembolsar.comprador}.`,
        "Reembolso registrado",
      );
      cargar();
    } catch (error) {
      toast.error(error.message, "No pudimos registrar el reembolso");
    } finally {
      setReembolsando(false);
      setAReembolsar(null);
    }
  };

  const { datos } = estado;

  return (
    <Pantalla alRefrescar={cargar} refrescando={estado.cargando && Boolean(datos)}>
      <EtiquetaSeccion>Ventas</EtiquetaSeccion>
      <TituloEscena texto={nombre ?? datos?.evento?.nombre ?? "Compras del evento"} />

      {estado.cargando && !datos ? (
        <SkeletonLista cantidad={3} />
      ) : estado.error && !datos ? (
        <ErrorState
          titulo="No pudimos cargar las compras"
          mensaje={estado.error.message}
          alReintentar={cargar}
        />
      ) : (
        <>
          <Seccion>
            <EtiquetaSeccion>Entradas</EtiquetaSeccion>
            {datos.tipos.map((t) => (
              <Card key={t.id} testID={`resumen-tipo-${t.id}`}>
                <Fila>
                  <Nombre>{t.nombre}</Nombre>
                  {t.precioTexto ? <Valor>{t.precioTexto}</Valor> : null}
                </Fila>
                <BarraOcupacion vendidas={t.vendidas} cupo={t.cupo} etiqueta="Vendidas" />
                <Quedan $agotado={t.disponibles === 0}>{t.quedanTexto}</Quedan>
              </Card>
            ))}
          </Seccion>

          <Card>
            <Fila>
              <Etiqueta>Recaudación confirmada</Etiqueta>
              <Total testID="recaudacion">{datos.recaudacionTexto}</Total>
            </Fila>
            <Conteos>
              {Object.entries(datos.porEstado)
                .filter(([, n]) => n > 0)
                .map(([e, n]) => (
                  <Conteo key={e}>
                    {ETIQUETAS_ESTADO[e] ?? e}: {n}
                  </Conteo>
                ))}
            </Conteos>
            {datos.reembolsosPendientes > 0 ? (
              <Alerta accessibilityRole="alert">
                {datos.reembolsosPendientes}{" "}
                {datos.reembolsosPendientes === 1 ? "reembolso pendiente" : "reembolsos pendientes"}
              </Alerta>
            ) : null}
          </Card>

          <Chips
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTROS_ESTADO.map((f) => (
              <Chip
                key={f.etiqueta}
                etiqueta={f.etiqueta}
                seleccionado={filtro === f.valor}
                onPress={() => setFiltro(f.valor)}
              />
            ))}
          </Chips>

          <Seccion>
            {datos.compras.length === 0 ? (
              <EmptyState
                icono={Inbox}
                titulo={filtro ? "No hay compras con este estado" : "Todavía no hay compras"}
                mensaje="Cuando alguien compre entradas, las vas a ver acá."
              />
            ) : (
              datos.compras.map((c) => (
                <Card key={c.id} testID={`compra-${c.id}`}>
                  <AbrirCompra
                    onPress={() => navigation.navigate("DetalleCompra", { compraId: c.id })}
                    accessibilityRole="button"
                    accessibilityLabel={`${c.comprador}, ${c.cantidad} × ${c.tipoEntrada}, ${c.totalTexto}, ${c.estadoTexto}, ${c.fechaTexto}`}
                    accessibilityHint="Abre el detalle de la compra"
                    testID={`abrir-compra-${c.id}`}
                  >
                    <Fila>
                      <Nombre>{c.comprador}</Nombre>
                      <EstadoCompraBadge estado={c.estado} />
                    </Fila>
                    <Fila>
                      <Etiqueta>
                        {c.cantidad} × {c.tipoEntrada}
                      </Etiqueta>
                      <Valor>{c.totalTexto}</Valor>
                    </Fila>
                    <Etiqueta>{c.fechaTexto}</Etiqueta>
                  </AbrirCompra>
                  {c.puedeReembolsar ? (
                    <>
                      <Aviso>Reembolso automático el {c.fechaLimiteReembolsoTexto}</Aviso>
                      <Button
                        variant="secondary"
                        size="sm"
                        icono={RotateCcw}
                        onPress={() => setAReembolsar(c)}
                        testID={`reembolsar-${c.id}`}
                      >
                        Reembolsar
                      </Button>
                    </>
                  ) : null}
                </Card>
              ))
            )}
          </Seccion>
        </>
      )}

      <ModalConfirmacion
        visible={Boolean(aReembolsar)}
        titulo="¿Registrar el reembolso?"
        mensaje={
          aReembolsar
            ? `Confirmás que le devolviste ${aReembolsar.totalTexto} a ${aReembolsar.comprador}. La compra pasa a Reembolsada.`
            : ""
        }
        textoConfirmar="Reembolsar"
        textoCancelar="Volver"
        cargando={reembolsando}
        alConfirmar={reembolsar}
        alCancelar={() => setAReembolsar(null)}
      />
    </Pantalla>
  );
}

const Seccion = styled.View`
  gap: 12px;
`;

const Fila = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`;

const Nombre = styled.Text`
  flex-shrink: 1;
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Valor = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Etiqueta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Quedan = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplayItalic};
  font-size: ${({ theme }) => theme.typography.sizes.titleSm}px;
  color: ${({ theme, $agotado }) => ($agotado ? theme.colors.textMuted : theme.colors.accentText)};
`;

const Total = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Conteos = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 12px;
`;

const Conteo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Alerta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.accentText};
`;

const Aviso = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const AbrirCompra = styled.Pressable`
  gap: 8px;
  min-height: 44px;
`;

const Chips = styled.ScrollView`
  flex-grow: 0;
`;

export default ComprasEvento;
