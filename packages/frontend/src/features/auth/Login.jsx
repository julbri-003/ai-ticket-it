import { useRef, useState } from "react";
import { Platform } from "react-native";
import styled, { useTheme } from "styled-components/native";
import { ArrowLeft, AtSign, Ticket } from "lucide-react-native";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Pantalla } from "../../components/layout/Pantalla";
import {
  Button,
  EtiquetaSeccion,
  Input,
  LeyendaObligatorio,
  TextoTalon,
  TicketCard,
  TituloEscena,
} from "../../components/ui";

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarLogin({ email, password }) {
  const errores = {};
  if (!email.trim()) errores.email = "Ingresá tu email.";
  else if (!EMAIL_VALIDO.test(email.trim()))
    errores.email = "Revisá el email: falta algo (ej. nombre@mail.com).";
  if (!password) errores.password = "Ingresá tu contraseña.";
  return errores;
}

/** Login: validación inline; los errores del back (p. ej. credenciales inválidas) por Toast. */
export function Login({ navigation }) {
  const theme = useTheme();
  const { iniciarSesion } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const refPassword = useRef(null);

  const enviar = async () => {
    const encontrados = validarLogin({ email, password });
    setErrores(encontrados);
    if (Object.keys(encontrados).length > 0) return;
    setEnviando(true);
    try {
      await iniciarSesion(email, password);
    } catch (error) {
      toast.error(error.message, "No pudimos iniciar sesión");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Teclado behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pantalla edges={["top", "left", "right", "bottom"]}>
        <Volver
          onPress={() => navigation.navigate("Landing")}
          accessibilityRole="link"
          accessibilityLabel="Volver a la cartelera"
        >
          <ArrowLeft size={18} color={theme.colors.accentText} accessible={false} />
          <TextoVolver>Volver a la cartelera</TextoVolver>
        </Volver>

        <TicketCard
          talon={
            <FilaTalon>
              <TextoTalon>Talón de control</TextoTalon>
              <TextoTalon>Nº 000001</TextoTalon>
            </FilaTalon>
          }
        >
          <Centro>
            <EtiquetaSeccion>Boletería oficial</EtiquetaSeccion>
            <TituloEscena texto="Ingresá a tu cuenta" destacada="cuenta" centrado />
            <Bajada>Gestioná tus entradas o administrá tus eventos.</Bajada>
          </Centro>
          <Formulario>
            <LeyendaObligatorio />
            <Input
              label="Correo electrónico"
              requerido
              value={email}
              onChangeText={setEmail}
              error={errores.email}
              icono={AtSign}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => refPassword.current?.focus()}
              testID="login-email"
            />
            <Input
              ref={refPassword}
              label="Contraseña"
              requerido
              value={password}
              onChangeText={setPassword}
              error={errores.password}
              secure
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={enviar}
              testID="login-password"
            />
            <Button icono={Ticket} onPress={enviar} loading={enviando} bloque testID="login-enviar">
              Ingresar
            </Button>
          </Formulario>
          <FilaRegistro>
            <TextoSuave>¿Todavía no tenés cuenta?</TextoSuave>
            <Button variant="ghost" size="sm" onPress={() => navigation.navigate("Registro")}>
              Registrate acá
            </Button>
          </FilaRegistro>
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

const Centro = styled.View`
  align-items: center;
  gap: 10px;
  padding: 8px 0 16px;
`;

const Bajada = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  font-size: ${({ theme }) => theme.typography.sizes.body}px;
  line-height: 24px;
  color: ${({ theme }) => theme.colors.textSecondary};
  text-align: center;
`;

const Formulario = styled.View`
  gap: 16px;
`;

const FilaRegistro = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const TextoSuave = styled.Text`
  font-family: ${({ theme }) => theme.typography.fontBody};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const FilaTalon = styled.View`
  flex-direction: row;
  justify-content: space-between;
`;

export default Login;
