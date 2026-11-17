import styled from "styled-components/native";
import { useFoco } from "./foco";

/** Números a mostrar: siempre la primera y la última, la actual y sus vecinas, con "…". */
export function paginasVisibles(actual, totalPaginas) {
  const paginas = new Set([1, totalPaginas, actual - 1, actual, actual + 1]);
  const ordenadas = [...paginas].filter((p) => p >= 1 && p <= totalPaginas).sort((a, b) => a - b);
  const resultado = [];
  ordenadas.forEach((p, i) => {
    if (i > 0 && p - ordenadas[i - 1] > 1) resultado.push("…");
    resultado.push(p);
  });
  return resultado;
}

function PillPagina({ numero, actual, onPress }) {
  const { enfocado, propsFoco } = useFoco();
  return (
    <Pill
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Página ${numero}`}
      accessibilityState={{ selected: actual }}
      $actual={actual}
      $enfocado={enfocado}
      {...propsFoco}
    >
      <TextoPill $actual={actual}>{numero}</TextoPill>
    </Pill>
  );
}

/**
 * Pills numeradas + "Mostrando 1–10 de 87". Las listas largas piden páginas al back
 * (`pagina`, `limite`) y usan este componente.
 */
export function Paginacion({ pagina, total, limite, onCambiar }) {
  const totalPaginas = Math.max(1, Math.ceil(total / limite));
  if (total === 0) return null;
  const desde = (pagina - 1) * limite + 1;
  const hasta = Math.min(total, pagina * limite);

  return (
    <Contenedor accessibilityLabel="Paginación">
      <Resumen accessibilityLiveRegion="polite">
        Mostrando {desde}–{hasta} de {total}
      </Resumen>
      {totalPaginas > 1 ? (
        <Fila>
          {paginasVisibles(pagina, totalPaginas).map((p, i) =>
            p === "…" ? (
              <Puntos key={`puntos-${i}`} accessible={false}>
                …
              </Puntos>
            ) : (
              <PillPagina
                key={p}
                numero={p}
                actual={p === pagina}
                onPress={() => p !== pagina && onCambiar(p)}
              />
            ),
          )}
        </Fila>
      ) : null}
    </Contenedor>
  );
}

const Contenedor = styled.View`
  align-items: center;
  gap: 12px;
  padding: 8px 0;
`;

const Resumen = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Fila = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

const Pill = styled.Pressable`
  min-width: 44px;
  height: 44px;
  padding: 0 12px;
  border-radius: ${({ theme }) => theme.borderRadius.full}px;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme, $actual }) =>
    $actual ? theme.colors.primary : theme.colors.surface};
  border-width: ${({ $enfocado }) => ($enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $actual, $enfocado }) =>
    $enfocado ? theme.colors.focusRing : $actual ? theme.colors.primary : theme.colors.divider};
`;

const TextoPill = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  color: ${({ theme, $actual }) => ($actual ? theme.colors.onPrimary : theme.colors.textPrimary)};
`;

const Puntos = styled.Text`
  align-self: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default Paginacion;
