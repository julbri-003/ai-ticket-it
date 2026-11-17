import styled from "styled-components/native";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { useTheme } from "../../context/ThemeContext";
import { Chip } from "../ui/Basicos";

const OPCIONES_TEMA = [
  { valor: "sistema", etiqueta: "Sistema", icono: Monitor },
  { valor: "claro", etiqueta: "Claro", icono: Sun },
  { valor: "oscuro", etiqueta: "Oscuro", icono: Moon },
];

/** Selector de tema (Sistema / Claro / Oscuro) reutilizable en Footer y Perfil. */
export function SelectorTema() {
  const { preferencia, setThemeMode } = useTheme();
  return (
    <FilaChips accessibilityRole="radiogroup" accessibilityLabel="Tema de la aplicación">
      {OPCIONES_TEMA.map(({ valor, etiqueta, icono }) => (
        <Chip
          key={valor}
          etiqueta={etiqueta}
          icono={icono}
          seleccionado={preferencia === valor}
          onPress={() => setThemeMode(valor)}
        />
      ))}
    </FilaChips>
  );
}

/** Pie de la Landing y de Explorar: links, cambio de tema y ©. */
export function Footer({ links = [] }) {
  return (
    <Contenedor>
      <Marca accessibilityRole="header">AI Ticket It</Marca>
      <Texto>
        La boletería digital de Argentina: entradas seguras, transparentes y al instante para
        recitales, teatro y festivales.
      </Texto>
      {links.length > 0 ? (
        <Links>
          {links.map(({ etiqueta, alPresionar }) => (
            <Link key={etiqueta} onPress={alPresionar} accessibilityRole="link">
              <TextoLink>{etiqueta}</TextoLink>
            </Link>
          ))}
        </Links>
      ) : null}
      <SelectorTema />
      <Copyright>© {new Date().getFullYear()} AI Ticket It · CABA, Argentina</Copyright>
    </Contenedor>
  );
}

const Contenedor = styled.View`
  gap: 16px;
  padding: 24px 0 8px;
  border-top-width: 1px;
  border-top-color: ${({ theme }) => theme.colors.divider};
`;

const Marca = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontDisplay};
  font-size: ${({ theme }) => theme.typography.sizes.title}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Texto = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  line-height: 22px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Links = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 4px 16px;
`;

const Link = styled.Pressable`
  min-height: 44px;
  justify-content: center;
`;

const TextoLink = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.accentText};
  text-decoration-line: underline;
`;

const FilaChips = styled.View`
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`;

const Copyright = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export default Footer;
