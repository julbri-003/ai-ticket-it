import { useEffect, useRef, useState } from "react";
import * as SecureStore from "expo-secure-store";
import styled, { useTheme } from "styled-components/native";
import { Clock, Search, X } from "lucide-react-native";
import { Input } from "../ui";

const CLAVE_RECIENTES = "ati_busquedas_recientes";
const MAX_RECIENTES = 5;
export const DEBOUNCE_MS = 400;

async function leerRecientes() {
  try {
    return JSON.parse((await SecureStore.getItemAsync(CLAVE_RECIENTES)) ?? "[]");
  } catch {
    return [];
  }
}

function guardarRecientes(lista) {
  SecureStore.setItemAsync(CLAVE_RECIENTES, JSON.stringify(lista)).catch(() => {});
}

/**
 * Buscador con label visible, botón limpiar, debounce de 400 ms y búsquedas recientes
 * (las últimas 5, guardadas en el dispositivo y borrables).
 */
export function Buscador({ valor, onBuscar }) {
  const theme = useTheme();
  const [texto, setTexto] = useState(valor);
  const [recientes, setRecientes] = useState([]);
  const [enfocado, setEnfocado] = useState(false);
  const temporizador = useRef(null);

  useEffect(() => {
    leerRecientes().then(setRecientes);
  }, []);

  // Si los filtros se limpian desde afuera (pill ✕), el texto acompaña.
  useEffect(() => {
    setTexto(valor);
  }, [valor]);

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const recordar = (termino) => {
    const limpio = termino.trim();
    if (!limpio) return;
    setRecientes((previas) => {
      const nuevas = [
        limpio,
        ...previas.filter((r) => r.toLowerCase() !== limpio.toLowerCase()),
      ].slice(0, MAX_RECIENTES);
      guardarRecientes(nuevas);
      return nuevas;
    });
  };

  const cambiar = (nuevo) => {
    setTexto(nuevo);
    clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => {
      onBuscar(nuevo);
      if (nuevo.trim().length >= 3) recordar(nuevo);
    }, DEBOUNCE_MS);
  };

  const elegir = (termino) => {
    clearTimeout(temporizador.current);
    setTexto(termino);
    onBuscar(termino);
    recordar(termino);
  };

  const borrar = (termino) => {
    const nuevas = recientes.filter((r) => r !== termino);
    setRecientes(nuevas);
    guardarRecientes(nuevas);
  };

  return (
    <Contenedor>
      <Input
        label="Buscar eventos, lugares u organizadores"
        value={texto}
        onChangeText={cambiar}
        icono={texto ? undefined : Search}
        placeholder="Ej.: jazz, Teatro Colón"
        returnKeyType="search"
        onSubmitEditing={() => elegir(texto)}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setTimeout(() => setEnfocado(false), 150)}
        testID="buscador"
        extraLabel={
          texto ? (
            <Limpiar
              onPress={() => elegir("")}
              accessibilityRole="button"
              accessibilityLabel="Limpiar búsqueda"
            >
              <X size={16} color={theme.colors.accentText} accessible={false} />
              <TextoLimpiar>Limpiar</TextoLimpiar>
            </Limpiar>
          ) : null
        }
      />
      {enfocado && !texto && recientes.length > 0 ? (
        <Recientes accessibilityLabel="Búsquedas recientes">
          {recientes.map((termino) => (
            <FilaReciente key={termino}>
              <Termino
                onPress={() => elegir(termino)}
                accessibilityRole="button"
                accessibilityLabel={`Buscar ${termino}`}
              >
                <Clock size={16} color={theme.colors.textMuted} accessible={false} />
                <TextoTermino>{termino}</TextoTermino>
              </Termino>
              <BotonBorrar
                onPress={() => borrar(termino)}
                accessibilityRole="button"
                accessibilityLabel={`Borrar ${termino} de recientes`}
              >
                <X size={16} color={theme.colors.textMuted} accessible={false} />
              </BotonBorrar>
            </FilaReciente>
          ))}
        </Recientes>
      ) : null}
    </Contenedor>
  );
}

const Contenedor = styled.View`
  gap: 8px;
`;

const Limpiar = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 4px;
  min-height: 32px;
`;

const TextoLimpiar = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Recientes = styled.View`
  border-radius: ${({ theme }) => theme.borderRadius.md}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const FilaReciente = styled.View`
  flex-direction: row;
  align-items: center;
`;

const Termino = styled.Pressable`
  flex: 1;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 14px;
`;

const TextoTermino = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BotonBorrar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

export default Buscador;
