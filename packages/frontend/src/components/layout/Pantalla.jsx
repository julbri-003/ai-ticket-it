import { RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled, { useTheme } from "styled-components/native";

/**
 * Contenedor de cada pantalla: safe area, fondo del tema, scroll y pull-to-refresh opcional.
 * `edges` por defecto deja afuera el borde superior (lo cubre el header del navegador).
 */
export function Pantalla({
  children,
  scroll = true,
  alRefrescar,
  refrescando = false,
  edges = ["left", "right"],
  sinPadding = false,
  testID,
}) {
  const theme = useTheme();
  return (
    <Fondo edges={edges} testID={testID}>
      {scroll ? (
        <Scroll
          contentContainerStyle={{ padding: sinPadding ? 0 : 20, gap: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            alRefrescar ? (
              <RefreshControl
                refreshing={refrescando}
                onRefresh={alRefrescar}
                tintColor={theme.colors.accentText}
                colors={[theme.colors.primary]}
              />
            ) : undefined
          }
        >
          {children}
        </Scroll>
      ) : (
        <SinScroll $sinPadding={sinPadding}>{children}</SinScroll>
      )}
    </Fondo>
  );
}

const Fondo = styled(SafeAreaView)`
  flex: 1;
  background-color: ${({ theme }) => theme.colors.background};
`;

const Scroll = styled.ScrollView`
  flex: 1;
`;

const SinScroll = styled.View`
  flex: 1;
  padding: ${({ $sinPadding }) => ($sinPadding ? 0 : 20)}px;
`;

export default Pantalla;
