import styled, { useTheme } from "styled-components/native";
import { Plus, Trash2 } from "lucide-react-native";
import { Button, Input } from "../ui";

export const tipoVacio = () => ({
  clave: `${Date.now()}-${Math.random()}`,
  nombre: "",
  descripcion: "",
  precio: "",
  cupo: "",
});

/** Campos de un tipo de entrada (se reusan en el alta y en el modal de Editar). */
export function CamposTipoEntrada({ tipo, errores = {}, onCambiar, prefijo = "tipo" }) {
  const cambiar = (campo) => (valor) => onCambiar({ ...tipo, [campo]: valor });
  return (
    <>
      <Input
        label="Nombre"
        requerido
        value={tipo.nombre}
        onChangeText={cambiar("nombre")}
        error={errores.nombre}
        placeholder="General, VIP, Platea…"
        testID={`${prefijo}-nombre`}
      />
      <Input
        label="Descripción (opcional)"
        value={tipo.descripcion}
        onChangeText={cambiar("descripcion")}
        placeholder="Qué incluye"
      />
      <Fila>
        <Mitad>
          <Input
            label="Precio ($)"
            requerido
            value={String(tipo.precio)}
            onChangeText={cambiar("precio")}
            error={errores.precio}
            keyboardType="decimal-pad"
            testID={`${prefijo}-precio`}
          />
        </Mitad>
        <Mitad>
          <Input
            label="Cupo"
            requerido
            value={String(tipo.cupo)}
            onChangeText={cambiar("cupo")}
            error={errores.cupo}
            keyboardType="number-pad"
            testID={`${prefijo}-cupo`}
          />
        </Mitad>
      </Fila>
    </>
  );
}

/** Lista dinámica de tipos de entrada para crear un evento (agregar o quitar). */
export function EditorTiposEntrada({ tipos, errores, onCambiar }) {
  const theme = useTheme();
  const actualizar = (i, tipo) => onCambiar(tipos.map((t, j) => (j === i ? tipo : t)));
  const quitar = (i) => onCambiar(tipos.filter((_, j) => j !== i));

  return (
    <Lista>
      {tipos.map((tipo, i) => (
        <Bloque key={tipo.clave} accessibilityLabel={`Tipo de entrada ${i + 1}`}>
          <Cabecera>
            <Titulo>Tipo de entrada {i + 1}</Titulo>
            <Quitar
              onPress={() => quitar(i)}
              accessibilityRole="button"
              accessibilityLabel={`Quitar tipo de entrada ${i + 1}`}
              testID={`quitar-tipo-${i}`}
            >
              <Trash2 size={18} color={theme.colors.error} accessible={false} />
            </Quitar>
          </Cabecera>
          <CamposTipoEntrada
            tipo={tipo}
            errores={errores?.porTipo?.[i]}
            onCambiar={(t) => actualizar(i, t)}
            prefijo={`tipo-${i}`}
          />
        </Bloque>
      ))}
      {errores?.general ? (
        <TextoError accessibilityRole="alert" accessibilityLiveRegion="polite">
          {errores.general}
        </TextoError>
      ) : null}
      <Button
        variant="outline"
        icono={Plus}
        onPress={() => onCambiar([...tipos, tipoVacio()])}
        testID="agregar-tipo"
      >
        Agregar tipo de entrada
      </Button>
    </Lista>
  );
}

const Lista = styled.View`
  gap: 16px;
`;

const Bloque = styled.View`
  gap: 12px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: 1px;
  border-color: ${({ theme }) => theme.colors.divider};
`;

const Cabecera = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
`;

const Titulo = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const Quitar = styled.Pressable`
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
`;

const Fila = styled.View`
  flex-direction: row;
  gap: 12px;
`;

const Mitad = styled.View`
  flex: 1;
`;

const TextoError = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  color: ${({ theme }) => theme.colors.error};
`;

export default EditorTiposEntrada;
