import { useState } from "react";
import { Platform } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { ArrowLeft, Megaphone, Ticket, UserPlus } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Button,
  EtiquetaSeccion,
  Input,
  LeyendaObligatorio,
  TicketCard,
  TituloEscena,
  useFoco,
} from "../../components/ui";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = [
  {
    valor: "COMPRADOR",
    titulo: "Quiero comprar entradas",
    texto: "Explorá la cartelera, guardá favoritos y comprá en segundos.",
    icono: Ticket,
  },
  {
    valor: "ORGANIZADOR",
    titulo: "Quiero organizar eventos",
    texto: "Publicá tus funciones, administrá ventas y reembolsos.",
    icono: Megaphone,
  },
];

export function validarRegistro({ nombre, apellido, email, password, rol }) {
  const errores = {};
  if (!rol) errores.rol = "Elegí cómo vas a usar AI Ticket It.";
  if (!nombre.trim()) errores.nombre = "Ingresá tu nombre.";
  if (!apellido.trim()) errores.apellido = "Ingresá tu apellido.";
  if (!email.trim()) errores.email = "Ingresá tu email.";
  else if (!EMAIL_VALIDO.test(email.trim()))
    errores.email = "Revisá el email (ej. nombre@mail.com).";
  if (password.length < 8) errores.password = "La contraseña necesita al menos 8 caracteres.";
  return errores;
}

function TarjetaRol({ rol, seleccionado, onPress }) {
  const theme = useTheme();
  const { enfocado, propsFoco } = useFoco();
  const Icono = rol.icono;
  return (
    <OpcionRol
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={rol.titulo}
      accessibilityHint={rol.texto}
      accessibilityState={{ checked: seleccionado, selected: seleccionado }}
      $seleccionado={seleccionado}
      $enfocado={enfocado}
      {...propsFoco}
    >
      <Icono
        size={26}
        color={seleccionado ? theme.colors.accentText : theme.colors.textSecondary}
        accessible={false}
      />
      <TextosRol>
        <TituloRol>{rol.titulo}</TituloRol>
        <TextoRol>{rol.texto}</TextoRol>
      </TextosRol>
      <Radio $seleccionado={seleccionado} accessible={false}>
        {seleccionado ? <PuntoRadio /> : null}
      </Radio>
    </OpcionRol>
  );
}

/** Registro con selector de rol (no combinable). Validación inline; errores del back por Toast. */
export function Registro({ navigation, route }) {
  const theme = useTheme();
  const { registrarse } = useAuth();
  const toast = useToast();
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    rol: route?.params?.rol ?? null,
  });
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const cambiar = (campo) => (valor) => setDatos((d) => ({ ...d, [campo]: valor }));

  const enviar = async () => {
    const encontrados = validarRegistro(datos);
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      await registrarse(datos);
    } catch (error) {
      toast.error(error.message, "No pudimos crear tu cuenta");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Teclado behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pantalla edges={["top", "left", "right", "bottom"]}>
        <Volver
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <ArrowLeft size={18} color={theme.colors.accentText} accessible={false} />
          <TextoVolver>Volver</TextoVolver>
        </Volver>
        <EtiquetaSeccion>Nueva cuenta</EtiquetaSeccion>
        <TituloEscena texto="Sumate a la función" destacada="función" />

        <Grupo accessibilityRole="radiogroup" accessibilityLabel="¿Cómo vas a usar AI Ticket It?">
          <Pregunta>¿Cómo vas a usar AI Ticket It? *</Pregunta>
          {ROLES.map((rol) => (
            <TarjetaRol
              key={rol.valor}
              rol={rol}
              seleccionado={datos.rol === rol.valor}
              onPress={() => cambiar("rol")(rol.valor)}
            />
          ))}
          {errores.rol ? (
            <ErrorRol accessibilityLiveRegion="polite" accessibilityRole="alert">
              {errores.rol}
            </ErrorRol>
          ) : null}
        </Grupo>

        <TicketCard>
          <Formulario>
            <LeyendaObligatorio />
            <Input
              label="Nombre"
              requerido
              value={datos.nombre}
              onChangeText={cambiar("nombre")}
              error={errores.nombre}
              autoComplete="given-name"
              testID="registro-nombre"
            />
            <Input
              label="Apellido"
              requerido
              value={datos.apellido}
              onChangeText={cambiar("apellido")}
              error={errores.apellido}
              autoComplete="family-name"
              testID="registro-apellido"
            />
            <Input
              label="Correo electrónico"
              requerido
              value={datos.email}
              onChangeText={cambiar("email")}
              error={errores.email}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              testID="registro-email"
            />
            <Input
              label="Contraseña"
              requerido
              secure
              value={datos.password}
              onChangeText={cambiar("password")}
              error={errores.password}
              ayuda="Mínimo 8 caracteres."
              autoComplete="new-password"
              testID="registro-password"
            />
            <Button
              icono={UserPlus}
              onPress={enviar}
              loading={enviando}
              bloque
              testID="registro-enviar"
            >
              Crear cuenta
            </Button>
            <Button variant="ghost" size="sm" onPress={() => navigation.navigate("Login")}>
              Ya tengo cuenta: ingresar
            </Button>
          </Formulario>
        </TicketCard>
      </Pantalla>
    </Teclado>
  );
}

const Teclado = styled.KeyboardAvoidingView`
  flex: 1;
`;

const Volver = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  align-self: flex-start;
`;

const TextoVolver = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accentText};
`;

const Grupo = styled.View`
  gap: 12px;
`;

const Pregunta = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const OpcionRol = styled.Pressable`
  flex-direction: row;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border-radius: ${({ theme }) => theme.borderRadius.lg}px;
  background-color: ${({ theme }) => theme.colors.surface};
  border-width: ${({ $seleccionado, $enfocado }) => ($seleccionado || $enfocado ? 2 : 1)}px;
  border-color: ${({ theme, $seleccionado, $enfocado }) =>
    $enfocado
      ? theme.colors.focusRing
      : $seleccionado
        ? theme.colors.accentText
        : theme.colors.divider};
`;

const TextosRol = styled.View`
  flex: 1;
  gap: 2px;
`;

const TituloRol = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodySemibold};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const TextoRol = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.bodySm}px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Radio = styled.View`
  width: 22px;
  height: 22px;
  border-radius: 11px;
  border-width: 2px;
  border-color: ${({ theme, $seleccionado }) =>
    $seleccionado ? theme.colors.accentText : theme.colors.borderInput};
  align-items: center;
  justify-content: center;
`;

const PuntoRadio = styled.View`
  width: 10px;
  height: 10px;
  border-radius: 5px;
  background-color: ${({ theme }) => theme.colors.accentText};
`;

const ErrorRol = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBodyMedium};
  font-size: ${({ theme }) => theme.typography.sizes.caption}px;
  color: ${({ theme }) => theme.colors.error};
`;

const Formulario = styled.View`
  gap: 16px;
`;

export default Registro;
