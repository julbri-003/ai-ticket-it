import { ScrollView } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { SlidersHorizontal, X } from "lucide-react-native";
import { Chip } from "../ui";
import { useFoco } from "../ui/foco";
import { iconoCategoria } from "./iconosCategoria";

/**
 * Barra de filtros (pills horizontales): "✦ Para vos", "Todas" + categorías (multi-selección)
 * y el botón "Filtros" con contador de filtros activos.
 */
export function BarraFiltros({
  filtros,
  categorias,
  paraVosDisponible,
  filtrosActivos,
  onParaVos,
  onTodas,
  onCategoria,
  onAbrirFiltros,
}) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  return (
    <Fondo>
      {/* El botón Filtros queda fijo a la izquierda (fuera del scroll) para que se vea siempre. */}
      <BotonFiltros
        onPress={onAbrirFiltros}
        accessibilityRole="button"
        accessibilityLabel={filtrosActivos ? `Filtros, ${filtrosActivos} activos` : "Filtros"}
        $enfocado={enfocado}
        testID="boton-filtros"
        {...propsFoco}
      >
        <SlidersHorizontal size={18} color={theme.colors.textPrimary} accessible={false} />
        <TextoFiltros>Filtros</TextoFiltros>
        {filtrosActivos ? (
          <Contador>
            <TextoContador>{filtrosActivos}</TextoContador>
          </Contador>
        ) : null}
      </BotonFiltros>
      <Separador />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel="Filtros rápidos"
        style={{ flex: 1 }}
      >
        <Fila>
          <ParaVos
            onPress={paraVosDisponible ? onParaVos : undefined}
            disabled={!paraVosDisponible}
            accessibilityRole="button"
            accessibilityLabel="Para vos"
            accessibilityHint={
              paraVosDisponible
                ? "Muestra eventos según tus favoritos"
                : "Guardá eventos en favoritos para activar este filtro"
            }
            accessibilityState={{ selected: filtros.paraVos, disabled: !paraVosDisponible }}
            $activo={filtros.paraVos}
            $inactivo={!paraVosDisponible}
            testID="pill-para-vos"
          >
            <TextoParaVos $activo={filtros.paraVos}>✦ Para vos</TextoParaVos>
          </ParaVos>
          <Chip
            etiqueta="Todas"
            seleccionado={filtros.categoriaIds.length === 0}
            onPress={onTodas}
          />
          {categorias.map((c) => (
            <Chip
              key={c.id}
              etiqueta={c.nombre}
              icono={iconoCategoria(c.nombre)}
              seleccionado={filtros.categoriaIds.includes(c.id)}
              onPress={() => onCategoria(c.id)}
            />
          ))}
        </Fila>
      </ScrollView>
    </Fondo>
  );
}

/** Pills de los filtros aplicados, cada una con ✕, y "Limpiar todo". */
export function PillsFiltrosAplicados({ pills, onQuitar, onLimpiar }) {
  const theme = useTheme();
  if (!pills.length) return null;
  return (
    <FilaAplicados>
      {pills.map((p) => (
        <PillAplicada
          key={p.clave}
          onPress={() => onQuitar(p.clave)}
          accessibilityRole="button"
          accessibilityLabel={`Quitar filtro ${p.etiqueta}`}
          testID={`pill-${p.clave}`}
        >
          <TextoAplicada>{p.etiqueta}</TextoAplicada>
          <X size={14} color={theme.colors.accentText} accessible={false} />
        </PillAplicada>
      ))}
      <LimpiarTodo onPress={onLimpiar} accessibilityRole="button">
        <TextoLimpiar>Limpiar todo</TextoLimpiar>
      </LimpiarTodo>
    </FilaAplicados>
  );
}

const Fondo = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Separador = styled.View`
  width: 1px;
  height: 28px;
  background-color: ${({ theme }) => theme.colors.divider};
`;

const Fila = styled.View`
  flex-direction: row;
  gap: 8px;
  padding: 0 2px;
`;

const ParaVos = styled.Pressable`
  min-height: 44px;
  padding: 0 16px;
  justify-content: center;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme, $activo }) =>
    $activo ? theme.colors.primary : theme.colors.surface};
  border-width: 1.5px;
  border-color: ${({ theme, $activo }) => ($activo ? theme.colors.primary : theme.colors.gold)};
  opacity: ${({ $inactivo }) => ($inactivo ? 0.5 : 1)};
`;

const TextoParaVos = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme, $activo }) => ($activo ? theme.colors.onPrimary : theme.colors.gold)};
`;

const BotonFiltros = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : theme.colors.borderInput};
`;

const TextoFiltros = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Contador = styled.View`
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.colors.primary};
`;

const TextoContador = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: 11px;
  color: ${({ theme }) => theme.colors.onPrimary};
`;

const FilaAplicados = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const PillAplicada = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 6px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  background-color: ${({ theme }) => theme.colors.surfaceSubtle};
`;

const TextoAplicada = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const LimpiarTodo = styled.Pressable`
  min-height: 36px;
  justify-content: center;
  padding: 0 4px;
`;

const TextoLimpiar = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.accentText};
  text-decoration-line: underline;
`;

export default BarraFiltros;
