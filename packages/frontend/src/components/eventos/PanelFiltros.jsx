import { useEffect, useMemo, useState } from "react";
import { Modal, ScrollView, Switch } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { X } from "lucide-react-native";
import { Button, Chip, EtiquetaSeccion, Input } from "../ui";
import { armarQuery, validarFiltros } from "../../hooks/useFiltrosEventos";
import { atajoFechas } from "../../utils/fechas";

const ORDENES = [
  { valor: "fecha", etiqueta: "Fecha" },
  { valor: "precio", etiqueta: "Precio" },
  { valor: "puntaje", etiqueta: "Puntaje del organizador" },
  { valor: "relevancia", etiqueta: "Relevancia" },
];
const PUNTAJES = [3, 4, 4.5];

/**
 * Bottom sheet de filtros: orden y dirección, rango de precio, rango de fechas (con atajos),
 * solo con entradas disponibles y puntaje mínimo. Trabaja sobre un borrador y muestra la
 * cantidad de resultados en vivo; "Aplicar" lo confirma.
 */
export function PanelFiltros({ visible, filtros, onAplicar, onCerrar, contar }) {
  const theme = useTheme();
  const [borrador, setBorrador] = useState(filtros);
  const [conteo, setConteo] = useState(null);
  const errores = useMemo(() => validarFiltros(borrador), [borrador]);
  const hayErrores = Object.keys(errores).length > 0;

  useEffect(() => {
    if (visible) setBorrador(filtros);
  }, [visible, filtros]);

  // Conteo en vivo (limite=1), con un pequeño debounce.
  useEffect(() => {
    if (!visible || hayErrores) return undefined;
    let vigente = true;
    const t = setTimeout(() => {
      contar(armarQuery({ ...borrador, pagina: 1 }))
        .then((total) => vigente && setConteo(total))
        .catch(() => vigente && setConteo(null));
    }, 300);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [visible, borrador, hayErrores, contar]);

  const cambiar = (parcial) => setBorrador((b) => ({ ...b, ...parcial }));
  const limpiar = () =>
    cambiar({
      orden: borrador.paraVos ? borrador.orden : "fecha",
      direccion: null,
      precioMin: "",
      precioMax: "",
      fechaDesde: "",
      fechaHasta: "",
      conDisponibilidad: false,
      puntajeMin: null,
    });
  const ordenes = ORDENES.filter((o) => o.valor !== "relevancia" || borrador.paraVos);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      statusBarTranslucent
    >
      <Fondo>
        <Hoja accessibilityViewIsModal testID="panel-filtros">
          <Cabecera>
            <Titulo accessibilityRole="header">Filtros</Titulo>
            <Cerrar
              onPress={onCerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar filtros"
            >
              <X size={22} color={theme.colors.textPrimary} accessible={false} />
            </Cerrar>
          </Cabecera>
          <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 16 }}>
            <Grupo>
              <EtiquetaSeccion>Ordenar por</EtiquetaSeccion>
              <FilaChips>
                {ordenes.map((o) => (
                  <Chip
                    key={o.valor}
                    etiqueta={o.etiqueta}
                    seleccionado={borrador.orden === o.valor}
                    onPress={() => cambiar({ orden: o.valor })}
                  />
                ))}
              </FilaChips>
              <FilaChips>
                <Chip
                  etiqueta="Ascendente ↑"
                  seleccionado={borrador.direccion === "asc"}
                  onPress={() =>
                    cambiar({ direccion: borrador.direccion === "asc" ? null : "asc" })
                  }
                />
                <Chip
                  etiqueta="Descendente ↓"
                  seleccionado={borrador.direccion === "desc"}
                  onPress={() =>
                    cambiar({ direccion: borrador.direccion === "desc" ? null : "desc" })
                  }
                />
              </FilaChips>
            </Grupo>

            <Grupo>
              <EtiquetaSeccion>Precio</EtiquetaSeccion>
              <FilaCampos>
                <Mitad>
                  <Input
                    label="Mínimo ($)"
                    value={borrador.precioMin}
                    onChangeText={(v) => cambiar({ precioMin: v })}
                    keyboardType="numeric"
                    error={errores.precioMin}
                    testID="filtro-precio-min"
                  />
                </Mitad>
                <Mitad>
                  <Input
                    label="Máximo ($)"
                    value={borrador.precioMax}
                    onChangeText={(v) => cambiar({ precioMax: v })}
                    keyboardType="numeric"
                    error={errores.precioMax}
                    testID="filtro-precio-max"
                  />
                </Mitad>
              </FilaCampos>
            </Grupo>

            <Grupo>
              <EtiquetaSeccion>Fechas</EtiquetaSeccion>
              <FilaChips>
                <Chip etiqueta="Este finde" onPress={() => cambiar(mapear(atajoFechas("finde")))} />
                <Chip
                  etiqueta="Próximos 7 días"
                  onPress={() => cambiar(mapear(atajoFechas("semana")))}
                />
                <Chip etiqueta="Este mes" onPress={() => cambiar(mapear(atajoFechas("mes")))} />
              </FilaChips>
              <FilaCampos>
                <Mitad>
                  <Input
                    label="Desde"
                    placeholder="DD/MM/AAAA"
                    value={borrador.fechaDesde}
                    onChangeText={(v) => cambiar({ fechaDesde: v })}
                    keyboardType="numbers-and-punctuation"
                    error={errores.fechaDesde}
                    testID="filtro-fecha-desde"
                  />
                </Mitad>
                <Mitad>
                  <Input
                    label="Hasta"
                    placeholder="DD/MM/AAAA"
                    value={borrador.fechaHasta}
                    onChangeText={(v) => cambiar({ fechaHasta: v })}
                    keyboardType="numbers-and-punctuation"
                    error={errores.fechaHasta}
                    testID="filtro-fecha-hasta"
                  />
                </Mitad>
              </FilaCampos>
            </Grupo>

            <FilaSwitch>
              <TextoSwitch nativeID="label-disponibles">Solo con entradas disponibles</TextoSwitch>
              <Switch
                value={borrador.conDisponibilidad}
                onValueChange={(v) => cambiar({ conDisponibilidad: v })}
                accessibilityLabel="Solo con entradas disponibles"
                accessibilityLabelledBy="label-disponibles"
                trackColor={{ true: theme.colors.primary, false: theme.colors.borderInput }}
                testID="filtro-disponibles"
              />
            </FilaSwitch>

            <Grupo>
              <EtiquetaSeccion>Puntaje mínimo del organizador</EtiquetaSeccion>
              <FilaChips>
                {PUNTAJES.map((p) => (
                  <Chip
                    key={p}
                    etiqueta={`${String(p).replace(".", ",")}+ ★`}
                    seleccionado={borrador.puntajeMin === p}
                    onPress={() => cambiar({ puntajeMin: borrador.puntajeMin === p ? null : p })}
                  />
                ))}
              </FilaChips>
            </Grupo>
          </ScrollView>
          <Pie>
            <Button variant="outline" onPress={limpiar}>
              Limpiar
            </Button>
            <Mitad>
              <Button
                onPress={() => onAplicar(borrador)}
                disabled={hayErrores}
                bloque
                testID="aplicar-filtros"
              >
                {conteo == null ? "Aplicar" : `Aplicar (${conteo} resultados)`}
              </Button>
            </Mitad>
          </Pie>
        </Hoja>
      </Fondo>
    </Modal>
  );
}

const mapear = ({ desde, hasta }) => ({ fechaDesde: desde, fechaHasta: hasta });

const Fondo = styled.View`
  flex: 1;
  justify-content: flex-end;
  background-color: ${({ theme }) => theme.colors.overlay};
`;

const Hoja = styled.View`
  max-height: 88%;
  padding: 16px 20px 24px;
  gap: 12px;
  border-top-left-radius: ${({ theme }) => theme.borderRadius.xl}px;
  border-top-right-radius: ${({ theme }) => theme.borderRadius.xl}px;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Cerrar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const Grupo = styled.View`
  gap: 10px;
`;

const FilaChips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const FilaCampos = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const Mitad = styled.View`
  flex: 1;
`;

const FilaSwitch = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  min-height: 44px;
`;

const TextoSwitch = styled.Text`
  flex: 1;
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Pie = styled.View`
  flex-direction: row;
  gap: 12px;
  align-items: center;
`;

export default PanelFiltros;
